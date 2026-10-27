/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Database,
  FilePlus2,
  FileText,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Course,
  LocalDocument,
  LocalDocumentChunk,
  PendingSyncMutation,
  SyncMetadata,
} from '../types/lms';
import { formatFileSize, validateAndIngestDocument } from '../utils/documentParser';
import { retrieveRelevantChunks } from '../utils/ragEngine';
import { FormattedText } from './FormattedText';

interface DocumentsAndSyncViewProps {
  courses: Course[];
  documents: LocalDocument[];
  chunks: LocalDocumentChunk[];
  mutations: PendingSyncMutation[];
  syncMetadata: SyncMetadata;
  lastSyncBannerMessage: string | null;
  onImportDocument: (params: {
    courseId: string;
    title: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    rawText: string;
    blobDataUrl?: string;
    wordCount?: number;
    readabilityStatus?: LocalDocument['readabilityStatus'];
    ingestionWarnings?: string[];
  }) => Promise<void>;
  onDeleteDocument: (docId: string) => Promise<void>;
  onAttemptHonestSync: (bridgeUrl?: string) => Promise<void>;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const DocumentsAndSyncView: React.FC<DocumentsAndSyncViewProps> = ({
  courses,
  documents,
  chunks,
  mutations,
  syncMetadata,
  lastSyncBannerMessage,
  onImportDocument,
  onDeleteDocument,
  onAttemptHonestSync,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState(courses[1]?.id ?? courses[0]?.id ?? '');
  const [courseFilterId, setCourseFilterId] = useState<string>('all');
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [selectedDocToRead, setSelectedDocToRead] = useState<LocalDocument | null>(
    documents[0] ?? null
  );
  const [readerTab, setReaderTab] = useState<'content' | 'chunks'>('content');
  const [bridgeUrl, setBridgeUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Interactive RAG Retrieval Diagnostic state
  const [diagnosticQuery, setDiagnosticQuery] = useState(
    'Candidate Key Super Key 2^(n-k) formula'
  );
  const [diagnosticCourseScope, setDiagnosticCourseScope] = useState<string>('all');

  const getCourseTitle = (courseId: string) => {
    return courses.find((c) => c.id === courseId)?.title ?? courseId;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportFeedback(null);

    const arrayBuf = await file.arrayBuffer();
    const validation = validateAndIngestDocument({
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      bytes: new Uint8Array(arrayBuf),
    });

    if (!validation.valid) {
      setImportError(validation.rejectionReason ?? `Validation failed for "${file.name}".`);
      e.target.value = '';
      return;
    }

    let blobDataUrl: string | undefined;
    if (validation.normalizedMimeType === 'application/pdf') {
      blobDataUrl = await readFileAsDataUrl(file);
    }

    await onImportDocument({
      courseId: selectedCourseId,
      title: docTitle.trim() || file.name.replace(/\.[^.]+$/, ''),
      fileName: file.name,
      mimeType: validation.normalizedMimeType,
      sizeBytes: file.size,
      rawText: validation.extractedText,
      blobDataUrl,
      wordCount: validation.wordCount,
      readabilityStatus: validation.readabilityStatus,
      ingestionWarnings: validation.warnings,
    });
    setDocTitle('');
    setImportFeedback(
      `Validated & ingested "${file.name}" (${formatFileSize(file.size)}, ${validation.wordCount} words, readability: ${validation.readabilityStatus.replace(/_/g, ' ')}) into local IndexedDB for ${getCourseTitle(selectedCourseId)}. Not uploaded to college server.`
    );
    e.target.value = '';
  };

  const handleManualDocImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportFeedback(null);

    if (!docTitle.trim() || !docContent.trim()) {
      setImportError('Please provide both a document title and readable text content.');
      return;
    }
    const raw = docContent.trim();
    const fileName = `${docTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}.md`;
    const encoded = new TextEncoder().encode(raw);

    const validation = validateAndIngestDocument({
      fileName,
      mimeType: 'text/markdown',
      sizeBytes: encoded.byteLength,
      rawText: raw,
    });

    if (!validation.valid) {
      setImportError(validation.rejectionReason ?? 'Document validation failed.');
      return;
    }

    await onImportDocument({
      courseId: selectedCourseId,
      title: docTitle.trim(),
      fileName,
      mimeType: validation.normalizedMimeType,
      sizeBytes: encoded.byteLength,
      rawText: validation.extractedText,
      wordCount: validation.wordCount,
      readabilityStatus: validation.readabilityStatus,
      ingestionWarnings: validation.warnings,
    });
    setDocTitle('');
    setDocContent('');
    setImportFeedback(
      `Validated & indexed "${fileName}" (${validation.wordCount} words) into local IndexedDB for ${getCourseTitle(selectedCourseId)}.`
    );
  };

  const handleDeleteDoc = async (doc: LocalDocument) => {
    await onDeleteDocument(doc.id);
    if (selectedDocToRead?.id === doc.id) {
      const remaining = documents.filter((d) => d.id !== doc.id);
      setSelectedDocToRead(remaining[0] ?? null);
    }
    setImportError(null);
    setImportFeedback(`Removed locally imported document "${doc.fileName}" and its RAG chunks from IndexedDB.`);
  };

  const handleSyncClick = async () => {
    setIsSyncing(true);
    await onAttemptHonestSync(bridgeUrl);
    setIsSyncing(false);
  };

  const visibleDocuments =
    courseFilterId === 'all'
      ? documents
      : documents.filter((d) => d.courseId === courseFilterId);

  const selectedDocChunks = selectedDocToRead
    ? chunks.filter((c) => c.documentId === selectedDocToRead.id)
    : [];

  const liveDiagnosticCitations = diagnosticQuery.trim()
    ? retrieveRelevantChunks(diagnosticQuery, chunks, {
        courseIdFilter: diagnosticCourseScope,
        topK: 3,
      })
    : [];

  return (
    <main className="w-full max-w-[960px] mx-auto px-4 sm:px-6 py-7 space-y-6">
      {/* Section 1: Local Document Ingestion Pipeline, Course Material List & Reader */}
      <section
        aria-labelledby="local-docs-heading"
        className="bg-white border border-[#dee2e6] rounded-[12px] p-5 sm:p-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <FilePlus2 className="w-5 h-5 text-[#0f6b3e]" />
          <h1 id="local-docs-heading" className="text-lg font-bold text-[#1d2125]">
            Course Material Management & Document Intelligence Pipeline
          </h1>
        </div>
        <p className="text-xs text-slate-600 mb-4">
          Import PDF documents (`.pdf`) or structured text materials (`.txt`, `.md`, `.json`,
          `.csv`) up to 15 MB. Every file passes through the local ingestion pipeline (file type,
          size, PDF signature, UTF-8 readability validation, and heading-aware BM25 chunking) and is
          stored in your browser&apos;s IndexedDB. Local imports are never simulated as uploaded to
          the remote college server.
        </p>

        {importError && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 font-medium"
          >
            Document Ingestion Rejected: {importError}
          </div>
        )}

        {importFeedback && (
          <div
            role="status"
            className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950"
          >
            {importFeedback}
          </div>
        )}

        <form
          onSubmit={handleManualDocImport}
          className="space-y-3 mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="doc-course-select"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Course Association
              </label>
              <select
                id="doc-course-select"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="doc-title-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Document Title
              </label>
              <input
                id="doc-title-input"
                type="text"
                placeholder="e.g., Unit 3 Normalization & BCNF Lecture Notes"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="doc-file-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Import Local PDF or Text File (Max 15 MB)
              </label>
              <label
                htmlFor="doc-file-input"
                className="w-full h-[34px] px-3 rounded-lg border border-dashed border-[#0f6b3e] bg-white hover:bg-emerald-50/40 text-xs font-medium text-[#0f6b3e] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Choose .pdf / .txt / .md / .csv / .json</span>
                <input
                  id="doc-file-input"
                  type="file"
                  accept=".pdf,.md,.txt,.json,.csv,application/pdf,text/plain,text/markdown,application/json,text/csv"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <div>
            <label
              htmlFor="doc-raw-textarea"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Or Paste Text / Markdown Document Content
            </label>
            <textarea
              id="doc-raw-textarea"
              rows={3}
              placeholder="Paste educational material or lecture notes here to validate, chunk, and index locally..."
              value={docContent}
              onChange={(e) => setDocContent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#0f6b3e] hover:bg-[#015303] text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
            >
              Import Text Material Locally
            </button>
          </div>
        </form>

        {/* Filter by course */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-bold text-slate-800">
            Stored Offline Course Materials ({visibleDocuments.length} documents · {chunks.length}{' '}
            indexed RAG chunks):
          </h2>
          <div className="flex items-center gap-2">
            <label htmlFor="filter-docs-course" className="text-xs text-slate-600">
              Filter by course:
            </label>
            <select
              id="filter-docs-course"
              value={courseFilterId}
              onChange={(e) => setCourseFilterId(e.target.value)}
              className="px-2.5 py-1 rounded-md border border-slate-300 text-xs bg-white"
            >
              <option value="all">All Courses ({documents.length})</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stored Local Documents List & Reader */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5">
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
              {visibleDocuments.map((doc) => {
                const isSelected = selectedDocToRead?.id === doc.id;
                const courseTitle = getCourseTitle(doc.courseId);
                const docChunksCount =
                  chunks.filter((c) => c.documentId === doc.id).length || doc.chunkCount;
                const docWords =
                  doc.wordCount ?? doc.rawText.trim().split(/\s+/).filter(Boolean).length;

                return (
                  <div
                    key={doc.id}
                    className={`p-3 text-xs transition flex items-start justify-between gap-2 ${
                      isSelected ? 'bg-[#0f6b3e]/10' : 'hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedDocToRead(doc)}
                      className="text-left flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-[#0f6b3e] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 truncate">{doc.title}</div>
                        <div className="text-[11px] font-mono tabular-nums text-slate-600 truncate mt-0.5">
                          {doc.fileName} ({formatFileSize(doc.sizeBytes)} · {docWords} words ·{' '}
                          {docChunksCount} chunks)
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Course: <span className="font-medium text-slate-700">{courseTitle}</span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">
                          {doc.isSampleBaseline
                            ? 'Sample Baseline · Verified Readable Text'
                            : `Locally Imported · ${(doc.readabilityStatus ?? 'readable_text').replace(/_/g, ' ')}`}
                        </div>
                      </div>
                    </button>

                    {!doc.isSampleBaseline && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc)}
                        aria-label={`Remove ${doc.fileName}`}
                        title="Remove locally imported document"
                        className="p-1.5 rounded-md text-slate-500 hover:text-red-700 hover:bg-red-50 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7">
            {selectedDocToRead ? (
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
                <div className="pb-2.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {selectedDocToRead.title}
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono tabular-nums mt-0.5">
                      Filename: {selectedDocToRead.fileName} ·{' '}
                      {formatFileSize(selectedDocToRead.sizeBytes)} · Course:{' '}
                      {getCourseTitle(selectedDocToRead.courseId)}
                    </div>
                    {selectedDocToRead.ingestionWarnings &&
                      selectedDocToRead.ingestionWarnings.length > 0 && (
                        <div className="text-[11px] text-amber-800 mt-1">
                          Ingestion Note: {selectedDocToRead.ingestionWarnings.join(' ')}
                        </div>
                      )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setReaderTab('content')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                        readerTab === 'content'
                          ? 'bg-[#0f6b3e] text-white'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Reader
                    </button>
                    <button
                      type="button"
                      onClick={() => setReaderTab('chunks')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                        readerTab === 'chunks'
                          ? 'bg-[#0f6b3e] text-white'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      RAG Chunks ({selectedDocChunks.length})
                    </button>
                    {!selectedDocToRead.isSampleBaseline && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(selectedDocToRead)}
                        className="px-2.5 py-1 rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-50 text-xs font-medium flex items-center gap-1 shrink-0 cursor-pointer whitespace-nowrap"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>

                {readerTab === 'content' ? (
                  <>
                    {selectedDocToRead.mimeType === 'application/pdf' &&
                      selectedDocToRead.blobDataUrl && (
                        <div className="w-full h-[380px] rounded-lg overflow-hidden border border-slate-300 bg-white">
                          <iframe
                            src={selectedDocToRead.blobDataUrl}
                            title={`Offline PDF Viewer: ${selectedDocToRead.fileName}`}
                            className="w-full h-full"
                          />
                        </div>
                      )}

                    <div className="p-3.5 rounded-lg bg-white border border-slate-200 max-h-[360px] overflow-y-auto text-xs text-slate-800">
                      <FormattedText text={selectedDocToRead.rawText} />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
                    {selectedDocChunks.map((chunk) => (
                      <div
                        key={chunk.id}
                        className="p-3 rounded-lg bg-white border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-slate-500">
                          <span className="font-bold text-[#0f6b3e]">
                            Chunk #{chunk.chunkIndex + 1}: {chunk.heading}
                          </span>
                          <span className="tabular-nums">
                            chars {chunk.charStart ?? 0}–{chunk.charEnd ?? chunk.text.length} ·{' '}
                            {chunk.tokenCount} tokens
                          </span>
                        </div>
                        <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {chunk.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center border border-slate-200 rounded-lg text-xs text-slate-500">
                Select a document on the left to read its full offline content or inspect its RAG
                chunks.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: Local RAG Retrieval & BM25 Diagnostics Inspector */}
      <section
        aria-labelledby="rag-diagnostics-heading"
        className="bg-white border border-[#dee2e6] rounded-[12px] p-5 sm:p-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <Search className="w-5 h-5 text-[#0f6b3e]" />
          <h2 id="rag-diagnostics-heading" className="text-base font-bold text-[#1d2125]">
            Local RAG Retrieval & BM25 Passage Ranking Inspector
          </h2>
        </div>
        <p className="text-xs text-slate-600 mb-4">
          Test how the offline retrieval engine ranks and extracts passages across your{' '}
          <span className="font-mono tabular-nums font-semibold">{chunks.length}</span> indexed
          document chunks before sending grounded context to the local Gemma 4 tutor.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4">
          <div className="sm:col-span-8">
            <label htmlFor="rag-diag-query" className="block text-xs font-semibold text-slate-700 mb-1">
              Test Retrieval Query
            </label>
            <input
              id="rag-diag-query"
              type="text"
              value={diagnosticQuery}
              onChange={(e) => setDiagnosticQuery(e.target.value)}
              placeholder="Enter keywords or a question to inspect BM25 chunk ranking..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
            />
          </div>
          <div className="sm:col-span-4">
            <label htmlFor="rag-diag-scope" className="block text-xs font-semibold text-slate-700 mb-1">
              Course Scope
            </label>
            <select
              id="rag-diag-scope"
              value={diagnosticCourseScope}
              onChange={(e) => setDiagnosticCourseScope(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
            >
              <option value="all">All Courses ({chunks.length} chunks)</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {liveDiagnosticCitations.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
            No matching passages found in local IndexedDB for this query and course scope.
          </div>
        ) : (
          <div className="space-y-2.5">
            {liveDiagnosticCitations.map((cit, idx) => (
              <div
                key={cit.chunkId}
                className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-slate-900">
                    Rank #{idx + 1}: {cit.documentTitle} → {cit.heading}
                  </div>
                  <div className="font-mono tabular-nums text-[11px] text-[#0f6b3e] font-semibold">
                    BM25 Score: {cit.score} · Chunk #{cit.chunkIndex ?? 0} ({cit.fileName})
                  </div>
                </div>
                {cit.matchedTerms && cit.matchedTerms.length > 0 && (
                  <div className="text-[11px] font-mono text-slate-500">
                    Matched Query Terms: {cit.matchedTerms.join(', ')}
                  </div>
                )}
                <div className="text-slate-700 whitespace-pre-wrap leading-relaxed bg-white p-2.5 rounded border border-slate-200/80">
                  {cit.excerpt}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 3: Honest Offline Synchronization & Local Mutation Queue */}
      <section
        aria-labelledby="sync-ledger-heading"
        className="bg-white border border-[#dee2e6] rounded-[12px] p-5 sm:p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#0f6b3e]" />
              <h2 id="sync-ledger-heading" className="text-base font-bold text-[#1d2125]">
                Offline Synchronization Status & Local Change Queue
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              SIET-LMS Offline clearly separates synchronized baseline data, unsynced local changes,
              and failed synchronization attempts without ever deleting your local work.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="px-4 py-2 rounded-lg bg-[#015303] hover:bg-[#0f6b3e] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Checking LMS Bridge...' : 'Attempt LMS Sync Now'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-slate-500">Baseline Snapshot Time</div>
            <div className="font-mono tabular-nums font-bold text-slate-900 mt-1">
              {syncMetadata.lastSuccessfulSyncAt
                ? new Date(syncMetadata.lastSuccessfulSyncAt).toLocaleString('en-IN')
                : '26 Oct 2026, 06:30 PM'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Clearly identified sample course baseline
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-slate-500">Last Sync Check Attempt</div>
            <div className="font-mono tabular-nums font-bold text-slate-900 mt-1">
              {syncMetadata.lastSyncAttemptAt
                ? new Date(syncMetadata.lastSyncAttemptAt).toLocaleString('en-IN')
                : 'Not attempted this session'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Bridge status: {syncMetadata.lmsBridgeStatus.replace(/_/g, ' ')}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-slate-500">Unsynced Local Changes</div>
            <div className="font-mono tabular-nums font-bold text-amber-800 text-sm mt-1">
              {mutations.length} Pending Item(s)
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Preserved in IndexedDB across restarts
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
          <label htmlFor="bridge-url-input" className="text-slate-600 font-medium shrink-0">
            Authorized SIET-LMS Bridge Endpoint (Optional):
          </label>
          <input
            id="bridge-url-input"
            type="url"
            placeholder="https://lms.siet.ac.in/api/offline-sync (Leave blank in standalone offline mode)"
            value={bridgeUrl}
            onChange={(e) => setBridgeUrl(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-md border border-slate-300 font-mono text-xs"
          />
        </div>

        {lastSyncBannerMessage && (
          <div
            role="status"
            className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950"
          >
            {lastSyncBannerMessage}
          </div>
        )}

        <div className="mt-5">
          <h3 className="text-xs font-bold text-slate-800 mb-2">
            Local Modification Log (Not Yet Reached Original College LMS):
          </h3>
          {mutations.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">
              No local modifications queued yet. Toggle any course activity &ldquo;Done&rdquo;
              button, complete a quiz, save a study note, or import a document to see it tracked
              here.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg max-h-52 overflow-y-auto">
              {mutations.map((m) => (
                <div
                  key={m.id}
                  className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900">{m.description}</span>
                    {m.lastError && (
                      <div className="text-[11px] text-amber-800 mt-0.5">
                        Last sync status: {m.lastError} (Local work preserved)
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-slate-500 shrink-0">
                    {new Date(m.createdAt).toLocaleTimeString()} ·{' '}
                    {m.status === 'sync_failed_offline'
                      ? 'Preserved After Unreachable Sync'
                      : 'Queued Locally'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};
