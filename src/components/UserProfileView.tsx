/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Database, FileText, LogOut, User } from 'lucide-react';
import {
  Course,
  LocalDocument,
  PendingSyncMutation,
  PersonalNote,
  SyncMetadata,
  UserSession,
} from '../types/lms';
import { calculateCourseCompletionStats } from '../utils/lmsLogic';
import { TopNavTab } from './TopNavBar';

interface UserProfileViewProps {
  session: UserSession;
  courses: Course[];
  documents: LocalDocument[];
  notes: PersonalNote[];
  mutations: PendingSyncMutation[];
  syncMetadata: SyncMetadata;
  onNavigateTab: (tab: TopNavTab) => void;
  onOpenCourse: (courseId: string) => void;
  onLogout: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  session,
  courses,
  documents,
  notes,
  mutations,
  syncMetadata,
  onNavigateTab,
  onOpenCourse,
  onLogout,
}) => {
  const userImportedDocs = documents.filter((d) => !d.isSampleBaseline);

  return (
    <main className="w-full max-w-[850px] mx-auto px-4 sm:px-6 pt-8 pb-20 space-y-6">
      {/* Student Profile Header Card */}
      <section className="bg-white border border-[#dee2e6] rounded-[10px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#e2e6ea] text-slate-800 font-bold text-xl flex items-center justify-center shrink-0">
            {session.initials}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1d2125]">{session.displayName}</h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {session.department} · Batch {session.batchYear}
            </p>
            <div className="text-xs text-slate-500 mt-1">
              Username: <span className="font-mono text-slate-800">{session.username}</span> · Local
              session started {new Date(session.loggedInAt).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('documents_sync')}
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Course Materials & Sync
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>
        </div>
      </section>

      {/* Local Storage & Offline Progress Summary */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#dee2e6] rounded-[10px] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <BookOpen className="w-4 h-4 text-[#0f6b3e]" />
            <span>Enrolled Courses (Sample Baseline)</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {courses.length}
          </div>
          <p className="text-[11.5px] text-slate-500 mt-1">
            Cached in IndexedDB for offline access
          </p>
        </div>

        <div className="bg-white border border-[#dee2e6] rounded-[10px] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <FileText className="w-4 h-4 text-[#0f6b3e]" />
            <span>Local Documents & Notes</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {documents.length} docs · {notes.length} notes
          </div>
          <p className="text-[11.5px] text-slate-500 mt-1">
            {userImportedDocs.length} user-imported material(s)
          </p>
        </div>

        <div className="bg-white border border-[#dee2e6] rounded-[10px] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Database className="w-4 h-4 text-[#0f6b3e]" />
            <span>Local Sync Queue</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-amber-800">
            {mutations.length} pending
          </div>
          <p className="text-[11.5px] text-slate-500 mt-1">
            Last baseline:{' '}
            {syncMetadata.lastSuccessfulSyncAt
              ? new Date(syncMetadata.lastSuccessfulSyncAt).toLocaleDateString('en-IN')
              : '26 Oct 2026'}
          </p>
        </div>
      </section>

      {/* Course Progress Breakdown */}
      <section className="bg-white border border-[#dee2e6] rounded-[10px] p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#1d2125]">
            Enrolled Course Progress (Offline Storage)
          </h2>
          <span className="text-xs text-slate-500">
            Sample baseline courses — not connected to live college server
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {courses.map((course) => {
            const stats = calculateCourseCompletionStats(course);
            const courseDocCount = documents.filter((d) => d.courseId === course.id).length;
            return (
              <div
                key={course.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => onOpenCourse(course.id)}
                    className="text-sm font-semibold text-[#0f6b3e] hover:underline text-left cursor-pointer"
                  >
                    {course.title}
                  </button>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {course.category} · {courseDocCount} stored document(s) ·{' '}
                    {stats.localModifiedCount > 0
                      ? `${stats.localModifiedCount} unsynced local update(s)`
                      : 'Baseline state'}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right font-mono tabular-nums text-xs text-slate-700">
                    <div className="font-bold">{stats.percent}% completed</div>
                    <div className="text-[11px] text-slate-500">
                      {stats.completedCount} of {stats.totalCount} activities done
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenCourse(course.id)}
                    className="px-3 py-1.5 rounded-md border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Open Course
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
};
