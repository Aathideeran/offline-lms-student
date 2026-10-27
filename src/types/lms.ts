/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SyncState = 'synced' | 'local_modified' | 'outdated' | 'sample_baseline';

export type ActivityItemType = 'link' | 'quiz' | 'document';

export interface CourseActivityItem {
  id: string;
  sectionId: string;
  courseId: string;
  title: string;
  type: ActivityItemType;
  done: boolean;
  syncState: SyncState;
  lastModifiedAt: string;
  contentSummary: string;
  contentBody: string;
  questions?: {
    id: string;
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export interface CourseSection {
  id: string;
  courseId: string;
  title: string;
  order: number;
  expanded?: boolean;
  items: CourseActivityItem[];
}

export interface Course {
  id: string;
  code: string;
  title: string;
  displayTitle: string;
  category: string;
  bannerPattern: 'pixel_gray' | 'waves_blue' | 'poly_teal';
  lastAccessedAt: string;
  syncState: SyncState;
  isSampleData: boolean;
  sections: CourseSection[];
}

export interface UpcomingEvent {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  dueDateIso: string;
  dueLabel: string;
  dateGroupLabel: string;
  timeLabel: string;
  activityType: 'quiz' | 'assignment' | 'exam';
  actionLabel: string;
  syncState: SyncState;
}

export type DocumentReadabilityStatus =
  | 'readable_text'
  | 'partial_pdf_text'
  | 'binary_only_pdf'
  | 'unreadable_rejected';

export interface LocalDocumentChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  fileName?: string;
  courseId: string;
  chunkIndex: number;
  heading: string;
  text: string;
  tokenCount: number;
  charStart?: number;
  charEnd?: number;
}

export interface LocalDocument {
  id: string;
  courseId: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  importedAt: string;
  rawText: string;
  blobDataUrl?: string;
  chunkCount: number;
  wordCount?: number;
  readabilityStatus?: DocumentReadabilityStatus;
  ingestionWarnings?: string[];
  isSampleBaseline: boolean;
  syncState: SyncState;
}

export interface PersonalNote {
  id: string;
  courseId: string;
  activityItemId?: string;
  title: string;
  content: string;
  updatedAt: string;
  syncState: SyncState;
}

export interface PendingSyncMutation {
  id: string;
  entityType: 'activity_completion' | 'personal_note' | 'imported_document' | 'quiz_attempt';
  entityId: string;
  description: string;
  createdAt: string;
  status: 'queued_locally' | 'sync_failed_offline';
  lastError?: string;
}

export interface SyncMetadata {
  lastBaselineSnapshotAt: string;
  lastSyncAttemptAt: string | null;
  lastSuccessfulSyncAt: string | null;
  connectionStatus: 'online_browser' | 'offline_browser';
  lmsBridgeStatus: 'unconfigured_local_only' | 'unreachable_preserved';
  pendingMutationCount: number;
}

export type RuntimeBackendId = 'ollama_local' | 'llama_cpp_local' | 'webgpu_browser';

export interface GemmaRuntimeConfig {
  backendId: RuntimeBackendId;
  endpointUrl: string;
  modelTag: string;
  temperature: number;
  maxTokens: number;
}

export interface RuntimeProbeResult {
  reachable: boolean;
  modelInstalled?: boolean;
  availableModels?: string[];
  backendId: RuntimeBackendId;
  endpointUrl: string;
  modelTag: string;
  latencyMs: number | null;
  statusMessage: string;
  checkedAt: string;
}

export interface RetrievedCitation {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  fileName?: string;
  courseId?: string;
  chunkIndex?: number;
  charStart?: number;
  charEnd?: number;
  heading: string;
  excerpt: string;
  score: number;
  matchedTerms?: string[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  citations?: RetrievedCitation[];
  groundingType?: 'document_grounded' | 'no_matching_passages';
  inferenceMode?: 'local_gemma4_runtime' | 'local_extractive_rag_fallback';
  runtimeModelTag?: string;
  runtimeError?: string;
}

export interface UserSession {
  username: string;
  displayName: string;
  initials: string;
  department: string;
  batchYear: string;
  loggedInAt: string;
}
