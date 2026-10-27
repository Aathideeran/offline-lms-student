/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Cpu, Database, ShieldCheck } from 'lucide-react';
import { Course, SyncMetadata } from '../types/lms';
import { TopNavTab } from './TopNavBar';

interface HomeViewProps {
  courses: Course[];
  syncMetadata: SyncMetadata;
  onNavigateTab: (tab: TopNavTab) => void;
  onOpenCourse: (courseId: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  courses,
  syncMetadata,
  onNavigateTab,
  onOpenCourse,
}) => {
  return (
    <main className="w-full max-w-[850px] mx-auto px-4 sm:px-6 pt-8 pb-20 space-y-6">
      <section className="bg-[#015303] text-[#f6e01c] rounded-[12px] p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Sri Shakthi Institute of Engineering and Technology — SIET-LMS Offline
        </h1>
        <p className="mt-2.5 text-sm sm:text-base text-[#f6e01c]/90 leading-relaxed max-w-2xl">
          Dedicated offline-first learning environment for Windows and Android devices. Study course
          modules, practice DBMS and CEP-I assessments, import notes, and query your local Gemma 4
          educational tutor without requiring an active internet connection.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab('dashboard')}
            className="px-4 py-2 rounded-lg bg-[#f6e01c] text-[#015303] text-xs font-bold hover:bg-yellow-300 transition cursor-pointer"
          >
            Go to Student Dashboard
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('gemma_tutor')}
            className="px-4 py-2 rounded-lg border border-[#f6e01c]/50 text-[#f6e01c] text-xs font-semibold hover:bg-white/10 transition cursor-pointer"
          >
            Open Local Gemma 4 AI Tutor
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#dee2e6] rounded-[10px] p-4">
          <BookOpen className="w-5 h-5 text-[#0f6b3e] mb-2" />
          <h2 className="text-sm font-bold text-slate-900">Cached Course Packages</h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {courses.length} SIET-LMS courses cached locally in IndexedDB with interactive quizzes
            and completion tracking.
          </p>
        </div>

        <div className="bg-white border border-[#dee2e6] rounded-[10px] p-4">
          <Cpu className="w-5 h-5 text-[#0f6b3e] mb-2" />
          <h2 className="text-sm font-bold text-slate-900">Gemma 4 Local RAG</h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Local document chunking and BM25 retrieval ground answers in your course files with
            explicit source citations.
          </p>
        </div>

        <div className="bg-white border border-[#dee2e6] rounded-[10px] p-4">
          <ShieldCheck className="w-5 h-5 text-[#0f6b3e] mb-2" />
          <h2 className="text-sm font-bold text-slate-900">Honest Sync Ledger</h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {syncMetadata.pendingMutationCount} local modification(s) queued safely. Never
            fabricates remote LMS synchronization.
          </p>
        </div>
      </section>

      <section className="bg-white border border-[#dee2e6] rounded-[10px] p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[#1d2125]">Available Offline Courses</h2>
          <button
            type="button"
            onClick={() => onNavigateTab('my_courses')}
            className="text-xs font-medium text-[#0f6b3e] hover:underline cursor-pointer"
          >
            View all courses →
          </button>
        </div>
        <div className="divide-y divide-slate-200">
          {courses.map((c) => (
            <div key={c.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <button
                  type="button"
                  onClick={() => onOpenCourse(c.id)}
                  className="text-sm font-semibold text-[#0f6b3e] hover:underline text-left cursor-pointer"
                >
                  {c.title}
                </button>
                <div className="text-xs text-slate-500">
                  {c.category} · {c.sections.length} section(s)
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenCourse(c.id)}
                className="px-3 py-1.5 rounded-md border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Open Course
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};
