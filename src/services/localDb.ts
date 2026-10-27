/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ChatMessage,
  Course,
  LocalDocument,
  LocalDocumentChunk,
  PendingSyncMutation,
  PersonalNote,
  SyncMetadata,
  UpcomingEvent,
  UserSession,
} from '../types/lms';
import {
  INITIAL_COURSES,
  INITIAL_DOCUMENTS,
  INITIAL_NOTES,
  INITIAL_SYNC_METADATA,
  INITIAL_UPCOMING_EVENTS,
} from '../data/initialData';
import { chunkDocumentText } from '../utils/ragEngine';

const DB_NAME = 'siet_lms_offline_db';
const DB_VERSION = 1;

export interface FullLocalState {
  courses: Course[];
  events: UpcomingEvent[];
  documents: LocalDocument[];
  chunks: LocalDocumentChunk[];
  notes: PersonalNote[];
  mutations: PendingSyncMutation[];
  syncMetadata: SyncMetadata;
  messages: ChatMessage[];
  session: UserSession | null;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('courses')) {
        db.createObjectStore('courses', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('documents')) {
        db.createObjectStore('documents', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('chunks')) {
        db.createObjectStore('chunks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('notes')) {
        db.createObjectStore('notes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('mutations')) {
        db.createObjectStore('mutations', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function putAllInStore<T>(db: IDBDatabase, storeName: string, items: T[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getKv<T>(db: IDBDatabase, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly');
    const store = tx.objectStore('kv');
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ? (req.result.value as T) : null);
    req.onerror = () => reject(req.error);
  });
}

async function setKv<T>(db: IDBDatabase, key: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    const store = tx.objectStore('kv');
    store.put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Generates synthetic study documents from all initial course activity items
 * so the RAG index covers every single lesson in the LMS out of the box.
 */
function buildCourseActivityDocuments(courses: Course[]): LocalDocument[] {
  const docs: LocalDocument[] = [];
  for (const course of courses) {
    const combinedSections = course.sections
      .map((sec) => {
        const itemsText = sec.items
          .map((item) => `## ${sec.title}: ${item.title}\n${item.contentBody}`)
          .join('\n\n');
        return itemsText;
      })
      .join('\n\n');

    if (combinedSections.trim()) {
      docs.push({
        id: `doc-course-pack-${course.id}`,
        courseId: course.id,
        title: `${course.title} — Built-in Course Modules`,
        fileName: `${course.code}_Course_Modules.md`,
        mimeType: 'text/markdown',
        sizeBytes: combinedSections.length,
        importedAt: '2026-10-26T18:30:00.000Z',
        rawText: combinedSections,
        chunkCount: 0,
        isSampleBaseline: true,
        syncState: 'sample_baseline',
      });
    }
  }
  return docs;
}

export async function initializeAndLoadLocalState(): Promise<FullLocalState> {
  const db = await openDatabase();
  let courses = await getAllFromStore<Course>(db, 'courses');

  if (courses.length === 0) {
    // Seed initial baseline data
    courses = INITIAL_COURSES;
    const events = INITIAL_UPCOMING_EVENTS;
    const activityDocs = buildCourseActivityDocuments(INITIAL_COURSES);
    const allDocs = [...INITIAL_DOCUMENTS, ...activityDocs];
    const allChunks: LocalDocumentChunk[] = [];

    const finalizedDocs = allDocs.map((doc) => {
      const docChunks = chunkDocumentText(doc);
      allChunks.push(...docChunks);
      return { ...doc, chunkCount: docChunks.length };
    });

    await putAllInStore(db, 'courses', courses);
    await putAllInStore(db, 'events', events);
    await putAllInStore(db, 'documents', finalizedDocs);
    await putAllInStore(db, 'chunks', allChunks);
    await putAllInStore(db, 'notes', INITIAL_NOTES);
    await setKv(db, 'syncMetadata', INITIAL_SYNC_METADATA);
  }

  const [events, documents, chunks, notes, mutations, messages, syncMetadata, session] =
    await Promise.all([
      getAllFromStore<UpcomingEvent>(db, 'events'),
      getAllFromStore<LocalDocument>(db, 'documents'),
      getAllFromStore<LocalDocumentChunk>(db, 'chunks'),
      getAllFromStore<PersonalNote>(db, 'notes'),
      getAllFromStore<PendingSyncMutation>(db, 'mutations'),
      getAllFromStore<ChatMessage>(db, 'messages'),
      getKv<SyncMetadata>(db, 'syncMetadata'),
      getKv<UserSession | null>(db, 'userSession'),
    ]);

  db.close();

  return {
    courses,
    events,
    documents,
    chunks,
    notes: notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    mutations: mutations.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    syncMetadata: syncMetadata ?? INITIAL_SYNC_METADATA,
    messages: messages.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ),
    session,
  };
}

export async function saveUserSession(session: UserSession | null): Promise<void> {
  const db = await openDatabase();
  await setKv(db, 'userSession', session);
  db.close();
}

export async function toggleActivityDoneInDb(
  courseId: string,
  sectionId: string,
  itemId: string
): Promise<{ courses: Course[]; mutations: PendingSyncMutation[]; syncMetadata: SyncMetadata }> {
  const db = await openDatabase();
  const courses = await getAllFromStore<Course>(db, 'courses');
  const mutations = await getAllFromStore<PendingSyncMutation>(db, 'mutations');
  const syncMetadata = (await getKv<SyncMetadata>(db, 'syncMetadata')) ?? INITIAL_SYNC_METADATA;

  const nowIso = new Date().toISOString();
  let toggledTitle = '';
  let newDoneState = false;

  const updatedCourses = courses.map((course) => {
    if (course.id !== courseId) return course;
    const updatedSections = course.sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      const updatedItems = sec.items.map((item) => {
        if (item.id !== itemId) return item;
        newDoneState = !item.done;
        toggledTitle = item.title;
        return {
          ...item,
          done: newDoneState,
          syncState: 'local_modified' as const,
          lastModifiedAt: nowIso,
        };
      });
      return { ...sec, items: updatedItems };
    });
    return {
      ...course,
      syncState: 'local_modified' as const,
      lastAccessedAt: nowIso,
      sections: updatedSections,
    };
  });

  const newMutation: PendingSyncMutation = {
    id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entityType: 'activity_completion',
    entityId: itemId,
    description: `Marked "${toggledTitle}" as ${newDoneState ? 'Done' : 'To Do'}`,
    createdAt: nowIso,
    status: 'queued_locally',
  };

  const updatedMutations = [newMutation, ...mutations];
  const updatedSync: SyncMetadata = {
    ...syncMetadata,
    pendingMutationCount: updatedMutations.length,
  };

  await putAllInStore(db, 'courses', updatedCourses);
  await putAllInStore(db, 'mutations', [newMutation]);
  await setKv(db, 'syncMetadata', updatedSync);
  db.close();

  return {
    courses: updatedCourses,
    mutations: updatedMutations,
    syncMetadata: updatedSync,
  };
}

export async function savePersonalNoteInDb(
  noteInput: Pick<PersonalNote, 'courseId' | 'activityItemId' | 'title' | 'content'> & { id?: string }
): Promise<{ notes: PersonalNote[]; mutations: PendingSyncMutation[]; syncMetadata: SyncMetadata }> {
  const db = await openDatabase();
  const nowIso = new Date().toISOString();
  const note: PersonalNote = {
    id: noteInput.id ?? `note-${Date.now()}`,
    courseId: noteInput.courseId,
    activityItemId: noteInput.activityItemId,
    title: noteInput.title.trim(),
    content: noteInput.content.trim(),
    updatedAt: nowIso,
    syncState: 'local_modified',
  };

  const mutation: PendingSyncMutation = {
    id: `mut-${Date.now()}`,
    entityType: 'personal_note',
    entityId: note.id,
    description: `Saved study note "${note.title}"`,
    createdAt: nowIso,
    status: 'queued_locally',
  };

  await putAllInStore(db, 'notes', [note]);
  await putAllInStore(db, 'mutations', [mutation]);

  const notes = await getAllFromStore<PersonalNote>(db, 'notes');
  const mutations = await getAllFromStore<PendingSyncMutation>(db, 'mutations');
  const syncMetadata = (await getKv<SyncMetadata>(db, 'syncMetadata')) ?? INITIAL_SYNC_METADATA;
  const updatedSync: SyncMetadata = {
    ...syncMetadata,
    pendingMutationCount: mutations.length,
  };
  await setKv(db, 'syncMetadata', updatedSync);
  db.close();

  return {
    notes: notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    mutations: mutations.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    syncMetadata: updatedSync,
  };
}

export async function deletePersonalNoteFromDb(noteId: string): Promise<PersonalNote[]> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite');
    tx.objectStore('notes').delete(noteId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  const notes = await getAllFromStore<PersonalNote>(db, 'notes');
  db.close();
  return notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function importLocalDocumentToDb(params: {
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
}): Promise<{
  documents: LocalDocument[];
  chunks: LocalDocumentChunk[];
  mutations: PendingSyncMutation[];
  syncMetadata: SyncMetadata;
}> {
  const db = await openDatabase();
  const nowIso = new Date().toISOString();
  const docId = `doc-user-${Date.now()}`;

  const computedWordCount =
    params.wordCount ?? params.rawText.trim().split(/\s+/).filter(Boolean).length;

  const baseDoc: LocalDocument = {
    id: docId,
    courseId: params.courseId,
    title: params.title.trim() || params.fileName,
    fileName: params.fileName,
    mimeType: params.mimeType || 'text/plain',
    sizeBytes: params.sizeBytes,
    importedAt: nowIso,
    rawText: params.rawText,
    blobDataUrl: params.blobDataUrl,
    chunkCount: 0,
    wordCount: computedWordCount,
    readabilityStatus: params.readabilityStatus ?? 'readable_text',
    ingestionWarnings: params.ingestionWarnings ?? [],
    isSampleBaseline: false,
    syncState: 'local_modified',
  };

  const docChunks = chunkDocumentText(baseDoc);
  baseDoc.chunkCount = docChunks.length;

  const mutation: PendingSyncMutation = {
    id: `mut-${Date.now()}`,
    entityType: 'imported_document',
    entityId: docId,
    description: `Imported local course material "${baseDoc.fileName}" (${docChunks.length} indexed passages)`,
    createdAt: nowIso,
    status: 'queued_locally',
  };

  await putAllInStore(db, 'documents', [baseDoc]);
  await putAllInStore(db, 'chunks', docChunks);
  await putAllInStore(db, 'mutations', [mutation]);

  const [documents, chunks, mutations, currentSync] = await Promise.all([
    getAllFromStore<LocalDocument>(db, 'documents'),
    getAllFromStore<LocalDocumentChunk>(db, 'chunks'),
    getAllFromStore<PendingSyncMutation>(db, 'mutations'),
    getKv<SyncMetadata>(db, 'syncMetadata'),
  ]);

  const updatedSync: SyncMetadata = {
    ...(currentSync ?? INITIAL_SYNC_METADATA),
    pendingMutationCount: mutations.length,
  };
  await setKv(db, 'syncMetadata', updatedSync);
  db.close();

  return {
    documents,
    chunks,
    mutations: mutations.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    syncMetadata: updatedSync,
  };
}

export async function deleteLocalDocumentFromDb(docId: string): Promise<{
  documents: LocalDocument[];
  chunks: LocalDocumentChunk[];
  mutations: PendingSyncMutation[];
  syncMetadata: SyncMetadata;
}> {
  const db = await openDatabase();
  const existingChunks = await getAllFromStore<LocalDocumentChunk>(db, 'chunks');
  const existingMutations = await getAllFromStore<PendingSyncMutation>(db, 'mutations');

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['documents', 'chunks', 'mutations'], 'readwrite');
    tx.objectStore('documents').delete(docId);

    const chunkStore = tx.objectStore('chunks');
    for (const chunk of existingChunks) {
      if (chunk.documentId === docId) {
        chunkStore.delete(chunk.id);
      }
    }

    const mutStore = tx.objectStore('mutations');
    for (const mut of existingMutations) {
      if (mut.entityId === docId) {
        mutStore.delete(mut.id);
      }
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  const [documents, chunks, mutations, currentSync] = await Promise.all([
    getAllFromStore<LocalDocument>(db, 'documents'),
    getAllFromStore<LocalDocumentChunk>(db, 'chunks'),
    getAllFromStore<PendingSyncMutation>(db, 'mutations'),
    getKv<SyncMetadata>(db, 'syncMetadata'),
  ]);

  const updatedSync: SyncMetadata = {
    ...(currentSync ?? INITIAL_SYNC_METADATA),
    pendingMutationCount: mutations.length,
  };
  await setKv(db, 'syncMetadata', updatedSync);
  db.close();

  return {
    documents,
    chunks,
    mutations: mutations.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    syncMetadata: updatedSync,
  };
}

export async function appendChatMessagesToDb(messagesToSave: ChatMessage[]): Promise<ChatMessage[]> {
  const db = await openDatabase();
  await putAllInStore(db, 'messages', messagesToSave);
  const allMessages = await getAllFromStore<ChatMessage>(db, 'messages');
  db.close();
  return allMessages.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function clearChatMessagesInDb(): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('messages', 'readwrite');
    tx.objectStore('messages').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/**
 * Honest Synchronization Handler:
 * Attempts to contact a configured SIET-LMS sync bridge if provided, or truthfully records
 * that the remote college LMS bridge is unreachable/unconfigured and preserves all local changes
 * in IndexedDB without deleting or fabricating remote server confirmation.
 */
export async function attemptHonestSyncWithLms(bridgeEndpointUrl?: string): Promise<{
  syncMetadata: SyncMetadata;
  mutations: PendingSyncMutation[];
  outcomeMessage: string;
}> {
  const db = await openDatabase();
  const mutations = await getAllFromStore<PendingSyncMutation>(db, 'mutations');
  const currentSync = (await getKv<SyncMetadata>(db, 'syncMetadata')) ?? INITIAL_SYNC_METADATA;
  const nowIso = new Date().toISOString();
  const isBrowserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  let reachable = false;
  let errorDetail = 'No authorized SIET-LMS remote API bridge configured.';

  if (isBrowserOnline && bridgeEndpointUrl && bridgeEndpointUrl.trim().length > 0) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(bridgeEndpointUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mutations }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        reachable = true;
      } else {
        errorDetail = `Remote bridge returned HTTP ${res.status}.`;
      }
    } catch (err) {
      errorDetail =
        err instanceof Error
          ? `Bridge connection failed (${err.message}).`
          : 'Network error contacting SIET-LMS bridge.';
    }
  } else if (!isBrowserOnline) {
    errorDetail = 'Device is currently offline (navigator.onLine = false).';
  }

  const updatedMutations: PendingSyncMutation[] = mutations.map((m) => ({
    ...m,
    status: 'sync_failed_offline',
    lastError: errorDetail,
  }));

  const updatedSync: SyncMetadata = {
    ...currentSync,
    lastSyncAttemptAt: nowIso,
    lastSuccessfulSyncAt: reachable ? nowIso : currentSync.lastSuccessfulSyncAt,
    connectionStatus: isBrowserOnline ? 'online_browser' : 'offline_browser',
    lmsBridgeStatus: 'unreachable_preserved',
    pendingMutationCount: updatedMutations.length,
  };

  if (updatedMutations.length > 0) {
    await putAllInStore(db, 'mutations', updatedMutations);
  }
  await setKv(db, 'syncMetadata', updatedSync);
  db.close();

  const outcomeMessage = `Sync check recorded at ${new Date(nowIso).toLocaleTimeString()}: ${errorDetail} All ${updatedMutations.length} local change(s) remain safely preserved in IndexedDB.`;

  return {
    syncMetadata: updatedSync,
    mutations: updatedMutations.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    outcomeMessage,
  };
}
