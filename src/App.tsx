/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
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
} from './types/lms';
import {
  INITIAL_COURSES,
  INITIAL_DOCUMENTS,
  INITIAL_NOTES,
  INITIAL_SYNC_METADATA,
  INITIAL_UPCOMING_EVENTS,
} from './data/initialData';
import {
  appendChatMessagesToDb,
  attemptHonestSyncWithLms,
  clearChatMessagesInDb,
  deleteLocalDocumentFromDb,
  deletePersonalNoteFromDb,
  importLocalDocumentToDb,
  initializeAndLoadLocalState,
  savePersonalNoteInDb,
  saveUserSession,
  toggleActivityDoneInDb,
} from './services/localDb';
import { LoginPage } from './components/LoginPage';
import { TopNavBar, TopNavTab } from './components/TopNavBar';
import { DashboardView } from './components/DashboardView';
import { CourseDetailView } from './components/CourseDetailView';
import { GemmaTutorView } from './components/GemmaTutorView';
import { DocumentsAndSyncView } from './components/DocumentsAndSyncView';
import { MyCoursesView } from './components/MyCoursesView';
import { HomeView } from './components/HomeView';
import { UserProfileView } from './components/UserProfileView';
import { useOnlineStatus } from './hooks/usePWAInstall';

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<TopNavTab>('dashboard');
  const [activeCourseId, setActiveCourseId] = useState<string>('course-dbms-2029');
  const [activeCourseItemId, setActiveCourseItemId] = useState<string | null>(null);

  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [events, setEvents] = useState<UpcomingEvent[]>(INITIAL_UPCOMING_EVENTS);
  const [documents, setDocuments] = useState<LocalDocument[]>(INITIAL_DOCUMENTS);
  const [chunks, setChunks] = useState<LocalDocumentChunk[]>([]);
  const [notes, setNotes] = useState<PersonalNote[]>(INITIAL_NOTES);
  const [mutations, setMutations] = useState<PendingSyncMutation[]>([]);
  const [syncMetadata, setSyncMetadata] = useState<SyncMetadata>(INITIAL_SYNC_METADATA);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastSyncBannerMessage, setLastSyncBannerMessage] = useState<string | null>(null);

  const [gemmaPromptSeed, setGemmaPromptSeed] = useState<string>('');
  const [gemmaCourseSeed, setGemmaCourseSeed] = useState<string>('all');

  const isOnline = useOnlineStatus();

  useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams(window.location.search);
    const isAutostart = params.get('autostart') === '1';

    initializeAndLoadLocalState()
      .then((state) => {
        if (!mounted) return;
        setCourses(state.courses);
        setEvents(state.events);
        setDocuments(state.documents);
        setChunks(state.chunks);
        setNotes(state.notes);
        setMutations(state.mutations);
        setSyncMetadata(state.syncMetadata);
        setMessages(state.messages);

        if (state.session) {
          setSession(state.session);
        } else if (isAutostart) {
          const defaultSession: UserSession = {
            username: 'AATHIDEERAN',
            displayName: 'AATHIDEERAN',
            initials: 'AV',
            department: 'B.E. Computer Science & Engineering',
            batchYear: '2029',
            loggedInAt: new Date().toISOString(),
          };
          setSession(defaultSession);
          saveUserSession(defaultSession);
        }
        setIsLoaded(true);
      })
      .catch(() => {
        if (!mounted) return;
        setIsLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleLoginSuccess = async (newSession: UserSession) => {
    setSession(newSession);
    setActiveTab('dashboard');
    await saveUserSession(newSession);
  };

  const handleLogout = async () => {
    setSession(null);
    await saveUserSession(null);
  };

  const handleOpenCourse = (courseId: string, initialItemId?: string) => {
    setActiveCourseId(courseId);
    setActiveCourseItemId(initialItemId ?? null);
    setActiveTab('course_detail');
  };

  const handleToggleItemDone = async (courseId: string, sectionId: string, itemId: string) => {
    const result = await toggleActivityDoneInDb(courseId, sectionId, itemId);
    setCourses(result.courses);
    setMutations(result.mutations);
    setSyncMetadata(result.syncMetadata);
  };

  const handleSaveNote = async (noteInput: {
    id?: string;
    courseId: string;
    activityItemId?: string;
    title: string;
    content: string;
  }) => {
    const result = await savePersonalNoteInDb(noteInput);
    setNotes(result.notes);
    setMutations(result.mutations);
    setSyncMetadata(result.syncMetadata);
  };

  const handleDeleteNote = async (noteId: string) => {
    const updatedNotes = await deletePersonalNoteFromDb(noteId);
    setNotes(updatedNotes);
  };

  const handleImportDocument = async (params: {
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
  }) => {
    const result = await importLocalDocumentToDb(params);
    setDocuments(result.documents);
    setChunks(result.chunks);
    setMutations(result.mutations);
    setSyncMetadata(result.syncMetadata);
  };

  const handleDeleteDocument = async (docId: string) => {
    const result = await deleteLocalDocumentFromDb(docId);
    setDocuments(result.documents);
    setChunks(result.chunks);
    setMutations(result.mutations);
    setSyncMetadata(result.syncMetadata);
  };

  const handleAttemptHonestSync = async (bridgeUrl?: string) => {
    const result = await attemptHonestSyncWithLms(bridgeUrl);
    setSyncMetadata(result.syncMetadata);
    setMutations(result.mutations);
    setLastSyncBannerMessage(result.outcomeMessage);
  };

  const handleTriggerSyncFromMenu = async () => {
    setActiveTab('documents_sync');
    await handleAttemptHonestSync();
  };

  const handleAppendChatMessages = async (newMsgs: ChatMessage[]) => {
    const updated = await appendChatMessagesToDb(newMsgs);
    setMessages(updated);
  };

  const handleClearChatMessages = async () => {
    await clearChatMessagesInDb();
    setMessages([]);
  };

  const handleAskGemmaAboutTopic = (prompt: string, courseId = 'all') => {
    setGemmaPromptSeed(prompt);
    setGemmaCourseSeed(courseId);
    setActiveTab('gemma_tutor');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-xs text-slate-500">
        Loading SIET-LMS Offline Local Database...
      </div>
    );
  }

  if (!session) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const activeCourse =
    courses.find((c) => c.id === activeCourseId) ?? courses[1] ?? courses[0];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <TopNavBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        session={session}
        syncMetadata={syncMetadata}
        onTriggerSyncCheck={handleTriggerSyncFromMenu}
        onLogout={handleLogout}
      />

      {!isOnline && (
        <div
          role="status"
          className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-center text-xs text-amber-950 font-medium"
        >
          Offline Mode Active — Working from cached SIET-LMS interface and local IndexedDB storage.
        </div>
      )}

      <div className="flex-1">
        {activeTab === 'dashboard' && (
          <DashboardView
            session={session}
            courses={courses}
            events={events}
            syncMetadata={syncMetadata}
            onOpenCourse={handleOpenCourse}
            onNavigateToSync={() => setActiveTab('documents_sync')}
            onNavigateToGemma={(prompt) => handleAskGemmaAboutTopic(prompt ?? '', 'all')}
          />
        )}

        {activeTab === 'home' && (
          <HomeView
            courses={courses}
            syncMetadata={syncMetadata}
            onNavigateTab={setActiveTab}
            onOpenCourse={handleOpenCourse}
          />
        )}

        {activeTab === 'my_courses' && (
          <MyCoursesView
            courses={courses}
            documents={documents}
            onOpenCourse={handleOpenCourse}
            onOpenMaterialManager={() => setActiveTab('documents_sync')}
          />
        )}

        {activeTab === 'profile' && (
          <UserProfileView
            session={session}
            courses={courses}
            documents={documents}
            notes={notes}
            mutations={mutations}
            syncMetadata={syncMetadata}
            onNavigateTab={setActiveTab}
            onOpenCourse={handleOpenCourse}
            onLogout={handleLogout}
          />
        )}

        {activeTab === 'course_detail' && activeCourse && (
          <CourseDetailView
            course={activeCourse}
            initialActiveItemId={activeCourseItemId}
            documents={documents}
            chunks={chunks}
            notes={notes}
            onToggleItemDone={handleToggleItemDone}
            onImportDocument={handleImportDocument}
            onDeleteDocument={handleDeleteDocument}
            onSaveNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
            onAskGemmaAboutTopic={handleAskGemmaAboutTopic}
            onBackToCourses={() => setActiveTab('my_courses')}
          />
        )}

        {activeTab === 'gemma_tutor' && (
          <GemmaTutorView
            courses={courses}
            chunks={chunks}
            messages={messages}
            initialPrompt={gemmaPromptSeed}
            initialCourseId={gemmaCourseSeed}
            onAppendMessages={handleAppendChatMessages}
            onClearMessages={handleClearChatMessages}
          />
        )}

        {activeTab === 'documents_sync' && (
          <DocumentsAndSyncView
            courses={courses}
            documents={documents}
            chunks={chunks}
            mutations={mutations}
            syncMetadata={syncMetadata}
            lastSyncBannerMessage={lastSyncBannerMessage}
            onImportDocument={handleImportDocument}
            onDeleteDocument={handleDeleteDocument}
            onAttemptHonestSync={handleAttemptHonestSync}
          />
        )}
      </div>
    </div>
  );
}
