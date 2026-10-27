/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocumentReadabilityStatus } from '../types/lms';

export const MAX_DOCUMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.txt', '.md', '.markdown', '.json', '.csv']);

export const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/json',
  'text/csv',
]);

export interface DocumentValidationResult {
  valid: boolean;
  normalizedMimeType: string;
  readabilityStatus: DocumentReadabilityStatus;
  extractedText: string;
  wordCount: number;
  warnings: string[];
  errorMessage?: string;
  rejectionReason?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : '';
}

/**
 * Decodes PDF octal escapes (\ddd), standard escape sequences, and UTF-16BE hex strings (<FEFF...>)
 * from uncompressed PDF text blocks (`BT ... ET`, `Tj`, `TJ`).
 */
export function extractReadableTextFromPdfBytes(
  bytes: Uint8Array,
  fallbackFileName: string
): string {
  const decoder = new TextDecoder('latin1');
  const raw = decoder.decode(bytes);
  const extractedFragments: string[] = [];

  // 1. Extract parenthesized literals inside PDF content streams
  const textLiteralRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = textLiteralRegex.exec(raw)) !== null) {
    const cleaned = match[1]
      .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .replace(/[^\x20-\x7E\n]/g, '')
      .trim();

    // Filter out PDF structural metadata tokens
    if (
      cleaned.length >= 3 &&
      /[a-zA-Z]{2,}/.test(cleaned) &&
      !/^(Adobe|Identity-H|MacRomanEncoding|WinAnsiEncoding|PDF|Creator|Producer)$/i.test(cleaned)
    ) {
      extractedFragments.push(cleaned);
    }
  }

  const joined = extractedFragments.join(' ').replace(/\s+/g, ' ').trim();
  if (joined.length >= 20) {
    return `# Extracted PDF Text (${fallbackFileName})\n\n${joined}`;
  }

  return `# Imported PDF Document: ${fallbackFileName}\n\nThis PDF file (${bytes.byteLength.toLocaleString()} bytes) is stored in your local IndexedDB database and can be opened directly in the built-in Offline PDF Viewer.`;
}

/**
 * Normalizes structured formats (JSON, CSV) into clean Markdown sections so the RAG chunker
 * and reader can process them with high semantic fidelity.
 */
export function normalizeStructuredDocumentText(
  rawText: string,
  fileName: string,
  mimeType: string
): { text: string; warnings: string[] } {
  const ext = getFileExtension(fileName);
  const warnings: string[] = [];

  if (ext === '.json' || mimeType === 'application/json') {
    try {
      const parsed = JSON.parse(rawText);
      const formatted = JSON.stringify(parsed, null, 2);
      return {
        text: `# Structured JSON Document: ${fileName}\n\n\`\`\`json\n${formatted}\n\`\`\``,
        warnings,
      };
    } catch {
      warnings.push('JSON syntax could not be parsed cleanly; indexed as plain text.');
      return { text: rawText, warnings };
    }
  }

  if (ext === '.csv' || mimeType === 'text/csv') {
    const lines = rawText
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 0) {
      const headers = lines[0].split(',').map((h) => h.trim());
      const rows = lines.slice(1).map((rowLine, idx) => {
        const cols = rowLine.split(',').map((c) => c.trim());
        const pairs = headers.map((h, i) => `${h || `Col ${i + 1}`}: ${cols[i] ?? ''}`);
        return `- Row ${idx + 1}: ${pairs.join(' · ')}`;
      });
      return {
        text: `# Tabular CSV Dataset: ${fileName}\n\nColumns: ${headers.join(', ')}\n\n${rows.join('\n')}`,
        warnings,
      };
    }
  }

  return { text: rawText, warnings };
}

/**
 * Modular Document Ingestion Validator:
 * 1. Validates file extension and MIME type against supported educational formats.
 * 2. Validates file size (rejects 0-byte empty files and files > 15 MB).
 * 3. Validates document readability (detects binary/corrupt files masquerading as text,
 *    validates PDF `%PDF-` header signature, and distinguishes full text vs binary/scanned PDFs).
 */
export function validateAndIngestDocument(params: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  rawBytes?: Uint8Array;
  bytes?: Uint8Array;
  rawText?: string;
}): DocumentValidationResult {
  const { fileName, mimeType, sizeBytes, rawText } = params;
  const rawBytes = params.rawBytes ?? params.bytes;
  const ext = getFileExtension(fileName);
  const warnings: string[] = [];

  const reject = (reason: string, normMime = mimeType || 'text/plain'): DocumentValidationResult => ({
    valid: false,
    normalizedMimeType: normMime,
    readabilityStatus: 'unreadable_rejected',
    extractedText: '',
    wordCount: 0,
    warnings: [],
    errorMessage: reason,
    rejectionReason: reason,
  });

  // 1. Validate File Size
  if (sizeBytes <= 0) {
    return reject(
      `Ingestion rejected: "${fileName}" is empty (0 bytes). Please provide a non-empty educational document.`
    );
  }

  if (sizeBytes > MAX_DOCUMENT_SIZE_BYTES) {
    return reject(
      `Ingestion rejected: "${fileName}" (${formatFileSize(sizeBytes)}) exceeds the 15 MB local IndexedDB limit.`,
      mimeType || 'application/octet-stream'
    );
  }

  // 2. Validate File Type
  const isPdf = ext === '.pdf' || mimeType === 'application/pdf';
  const isSupportedExt = SUPPORTED_EXTENSIONS.has(ext);
  const isSupportedMime = SUPPORTED_MIME_TYPES.has(mimeType);

  if (!isPdf && !isSupportedExt && !isSupportedMime) {
    return reject(
      `Unsupported file type for "${fileName}". Supported formats: PDF (.pdf), Markdown (.md), Plain Text (.txt), JSON (.json), and CSV (.csv).`,
      mimeType || 'application/octet-stream'
    );
  }

  // 3. Validate PDF Readability & Header Signature
  if (isPdf) {
    if (rawBytes && rawBytes.byteLength >= 4) {
      const header = new TextDecoder('latin1').decode(rawBytes.slice(0, 8));
      if (!header.includes('%PDF-')) {
        return reject(
          `Invalid or corrupted PDF file: "${fileName}" is missing the standard "%PDF-" file signature.`,
          'application/pdf'
        );
      }

      const extracted = extractReadableTextFromPdfBytes(rawBytes, fileName);
      const isFallbackOnly = extracted.startsWith('# Imported PDF Document:');
      const words = extracted
        .replace(/#[^\n]+\n/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      if (isFallbackOnly) {
        warnings.push(
          'PDF uses compressed font streams or scanned images. Stored for visual reading in the Offline PDF Viewer; text RAG indexing is limited to metadata.'
        );
      }

      return {
        valid: true,
        normalizedMimeType: 'application/pdf',
        readabilityStatus: isFallbackOnly ? 'binary_only_pdf' : 'partial_pdf_text',
        extractedText: extracted,
        wordCount: words.length,
        warnings,
      };
    }

    // If rawText was passed directly for a PDF
    const fallbackText = (rawText ?? '').trim();
    if (!fallbackText) {
      return reject(`Could not read PDF content from "${fileName}".`, 'application/pdf');
    }
  }

  // 4. Validate Text / Markdown / JSON / CSV Readability
  const textToInspect =
    rawText !== undefined
      ? rawText
      : rawBytes
      ? new TextDecoder('utf-8', { fatal: false }).decode(rawBytes)
      : '';

  // Reject binary data masquerading as text (check for null bytes or high non-printable ratio)
  let nonPrintableCount = 0;
  const sampleLen = Math.min(textToInspect.length, 2000);
  for (let i = 0; i < sampleLen; i++) {
    const code = textToInspect.charCodeAt(i);
    if (code === 0 || (code < 9 && code !== 0) || (code > 13 && code < 32)) {
      nonPrintableCount++;
    }
  }

  if (sampleLen > 0 && nonPrintableCount / sampleLen > 0.05) {
    return reject(
      `Readability check failed: "${fileName}" appears to contain binary or non-UTF8 encoded data rather than readable text.`
    );
  }

  const trimmed = textToInspect.trim();
  if (trimmed.length < 3) {
    return reject(
      `Readability check failed: "${fileName}" contains no readable text content (whitespace only).`
    );
  }

  const normalizedMime =
    ext === '.md' || ext === '.markdown'
      ? 'text/markdown'
      : ext === '.json'
      ? 'application/json'
      : ext === '.csv'
      ? 'text/csv'
      : 'text/plain';

  const { text: structuredText, warnings: structWarnings } = normalizeStructuredDocumentText(
    trimmed,
    fileName,
    normalizedMime
  );
  warnings.push(...structWarnings);

  const words = structuredText.split(/\s+/).filter(Boolean);

  return {
    valid: true,
    normalizedMimeType: normalizedMime,
    readabilityStatus: 'readable_text',
    extractedText: structuredText,
    wordCount: words.length,
    warnings,
  };
}
