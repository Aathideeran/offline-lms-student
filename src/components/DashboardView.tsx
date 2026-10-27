/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ListChecks, Search } from 'lucide-react';
import { Course, SyncMetadata, UpcomingEvent, UserSession } from '../types/lms';
import { CourseBanner } from './CourseBanner';
import {
  filterAndSortTimelineEvents,
  TimelineFilterMode,
  TimelineSortMode,
} from '../utils/lmsLogic';

interface DashboardViewProps {
  session: UserSession;
  courses: Course[];
  events: UpcomingEvent[];
  syncMetadata: SyncMetadata;
  onOpenCourse: (courseId: string, initialItemId?: string) => void;
  onNavigateToSync: () => void;
  onNavigateToGemma: (initialPrompt?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  session,
  courses,
  events,
  syncMetadata,
  onOpenCourse,
  onNavigateToSync,
  onNavigateToGemma,
}) => {
  const [carouselOffset, setCarouselOffset] = useState(0);
  const [filterMode, setFilterMode] = useState<TimelineFilterMode>('all');
  const [sortMode, setSortMode] = useState<TimelineSortMode>('dates');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const visibleCourses =
    carouselOffset === 0
      ? courses
      : [...courses.slice(carouselOffset), ...courses.slice(0, carouselOffset)];

  const filteredTimeline = filterAndSortTimelineEvents(events, {
    filterMode,
    sortMode,
    searchQuery,
  });

  const lastBaselineFormatted = syncMetadata.lastSuccessfulSyncAt
    ? new Date(syncMetadata.lastSuccessfulSyncAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '26 Oct 2026, 06:30 PM';

  return (
    <main className="w-full max-w-[850px] mx-auto px-4 sm:px-6 pt-8 pb-20">
      {/* Greeting Header matching Screenshot 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <h1 className="text-[26px] sm:text-[28px] font-bold text-[#1d2125] tracking-tight flex items-center gap-2">
          <span>Hi, {session.displayName}!</span>
          <span role="img" aria-label="Waving hand" className="text-[28px]">
            👋
          </span>
        </h1>

        {/* Quiet, unboxed metadata status line distinguishing sample baseline, local changes, and sync timestamp */}
        <div className="text-[12px] text-slate-500 flex flex-wrap items-center gap-1.5">
          <span>Sample Baseline Snapshot: {lastBaselineFormatted}</span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={onNavigateToSync}
            className="text-[#0f6b3e] hover:underline font-medium cursor-pointer"
          >
            {syncMetadata.pendingMutationCount > 0
              ? `${syncMetadata.pendingMutationCount} Local Edit(s) Pending Sync`
              : 'All Local Data Cached'}
          </button>
        </div>
      </div>

      {/* Section 1: Recently accessed courses */}
      <section
        aria-labelledby="recently-accessed-heading"
        className="bg-white border border-[#dee2e6] rounded-[10px] p-5 sm:p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            id="recently-accessed-heading"
            className="text-[16.5px] font-bold text-[#1d2125]"
          >
            Recently accessed courses
          </h2>

          {/* Functional "< | >" pagination buttons matching Screenshot 2 */}
          <div className="inline-flex items-center border border-[#ced4da] rounded-[6px] overflow-hidden bg-white">
            <button
              type="button"
              aria-label="Previous courses"
              onClick={() =>
                setCarouselOffset((prev) => (prev - 1 + courses.length) % courses.length)
              }
              className="w-8 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 border-r border-[#ced4da] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Next courses"
              onClick={() => setCarouselOffset((prev) => (prev + 1) % courses.length)}
              className="w-8 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {visibleCourses.map((course) => (
            <div
              key={course.id}
              className="group border border-[#dee2e6] rounded-[8px] overflow-hidden bg-white flex flex-col hover:border-[#0f6b3e]/50 transition"
            >
              <button
                type="button"
                onClick={() => onOpenCourse(course.id)}
                className="text-left w-full flex flex-col flex-1 focus:outline-none cursor-pointer"
              >
                <div className="h-[104px] w-full overflow-hidden bg-slate-100">
                  <CourseBanner pattern={course.bannerPattern} />
                </div>
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[13.5px] font-medium text-[#0f6b3e] group-hover:underline truncate">
                      {course.displayTitle}
                    </div>
                    <div className="text-[12.5px] text-[#6a737b] mt-0.5">
                      {course.category}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>
                      {course.syncState === 'local_modified'
                        ? 'Local Changes Saved'
                        : 'Sample Baseline Data'}
                    </span>
                    <span className="font-mono tabular-nums">
                      {course.sections.reduce((acc, s) => acc + s.items.length, 0)} items
                    </span>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Upcoming events */}
      <section
        aria-labelledby="upcoming-events-heading"
        className="bg-white border border-[#dee2e6] rounded-[10px] p-5 sm:p-6 mb-6"
      >
        <h2
          id="upcoming-events-heading"
          className="text-[16.5px] font-bold text-[#1d2125] mb-4"
        >
          Upcoming events
        </h2>

        <div className="space-y-4">
          {events.slice(0, 1).map((evt) => (
            <div key={evt.id} className="flex items-start gap-3.5">
              <div className="mt-0.5 w-8 h-8 rounded-[6px] border border-slate-700 flex items-center justify-center shrink-0 text-slate-800">
                <ListChecks className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onOpenCourse(evt.courseId, 'item-cep-retest-quiz')}
                  className="text-left text-[13.5px] font-bold text-[#0f6b3e] hover:underline block cursor-pointer"
                >
                  {evt.title}
                </button>
                <div className="text-[12.5px] text-slate-600 mt-0.5">{evt.dueLabel}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-[#e9ecef] flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowCalendarModal(true)}
            className="text-[13px] text-[#0f6b3e] hover:underline cursor-pointer"
          >
            Go to calendar...
          </button>
          <button
            type="button"
            onClick={() =>
              onNavigateToGemma(
                'Give me a quick revision summary for 25ENS311-CEP 1 Quants & Verbal Retest'
              )
            }
            className="text-[12px] text-[#0f6b3e] hover:underline font-medium cursor-pointer"
          >
            Prepare with Local Gemma 4 Tutor →
          </button>
        </div>
      </section>

      {/* Section 3: Timeline */}
      <section
        aria-labelledby="timeline-heading"
        className="bg-white border border-[#dee2e6] rounded-[10px] p-5 sm:p-6"
      >
        <h2 id="timeline-heading" className="text-[16.5px] font-bold text-[#1d2125] mb-4">
          Timeline
        </h2>

        {/* Filter bar matching Screenshot 2: "All v", "Sort by dates v", and "Search by activity type or name" */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#e9ecef]">
          <div className="flex items-center gap-2.5">
            <div>
              <label htmlFor="timeline-filter-select" className="sr-only">
                Filter timeline by date range
              </label>
              <select
                id="timeline-filter-select"
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as TimelineFilterMode)}
                className="h-[36px] px-3 rounded-[6px] border border-[#ced4da] bg-white text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f6b3e] cursor-pointer"
              >
                <option value="all">All</option>
                <option value="next_7_days">Next 7 days</option>
                <option value="next_30_days">Next 30 days</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div>
              <label htmlFor="timeline-sort-select" className="sr-only">
                Sort timeline activities
              </label>
              <select
                id="timeline-sort-select"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as TimelineSortMode)}
                className="h-[36px] px-3 rounded-[6px] border border-[#ced4da] bg-white text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f6b3e] cursor-pointer"
              >
                <option value="dates">Sort by dates</option>
                <option value="courses">Sort by courses</option>
              </select>
            </div>
          </div>

          <div className="relative w-full sm:w-[265px]">
            <label htmlFor="timeline-search-input" className="sr-only">
              Search by activity type or name
            </label>
            <input
              id="timeline-search-input"
              type="search"
              placeholder="Search by activity type or name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[36px] px-3 rounded-[6px] border border-[#ced4da] bg-white text-[13px] text-slate-800 placeholder:text-[#6a737b] focus:outline-none focus:ring-2 focus:ring-[#0f6b3e]"
            />
          </div>
        </div>

        {/* Timeline Activity List */}
        {filteredTimeline.length === 0 ? (
          <div className="py-10 text-center">
            <Search className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">
              No timeline activities match the current filter.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Try switching the date range filter to &ldquo;All&rdquo; or clearing the search box.
            </p>
            {(filterMode !== 'all' || searchQuery.trim() !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterMode('all');
                  setSearchQuery('');
                }}
                className="mt-3 px-3.5 py-1.5 rounded-md border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Reset Timeline Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#e9ecef]">
            {filteredTimeline.map((evt) => (
              <div key={evt.id} className="pt-4 pb-4">
                <h3 className="text-[13px] font-bold text-[#1d2125] mb-3">
                  {evt.dateGroupLabel}
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-1">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <span className="text-[12.5px] font-mono tabular-nums text-slate-600 pt-1 shrink-0">
                      {evt.timeLabel}
                    </span>
                    <div className="mt-0.5 w-7 h-7 rounded-[5px] border border-slate-700 flex items-center justify-center shrink-0 text-slate-800">
                      <ListChecks className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenCourse(
                            evt.courseId,
                            evt.courseId === 'course-25enh311'
                              ? 'item-cep-retest-quiz'
                              : 'item-sql-db5'
                          )
                        }
                        className="text-left text-[13.5px] font-bold text-[#0f6b3e] hover:underline block truncate cursor-pointer"
                      >
                        {evt.title.replace(/ closes$/, '')}
                      </button>
                      <div className="text-[12px] text-[#6a737b] mt-0.5">
                        Quiz closes · {evt.courseName}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onOpenCourse(
                        evt.courseId,
                        evt.courseId === 'course-25enh311'
                          ? 'item-cep-retest-quiz'
                          : 'item-sql-db5'
                      )
                    }
                    className="self-start sm:self-center px-3 py-1.5 rounded-[5px] border border-[#ced4da] bg-white hover:bg-slate-50 text-[12.5px] text-slate-700 whitespace-nowrap shrink-0 transition cursor-pointer"
                  >
                    {evt.actionLabel}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Calendar Modal triggered by "Go to calendar..." */}
      {showCalendarModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 id="calendar-modal-title" className="text-base font-bold text-slate-900">
                SIET-LMS Offline Academic Calendar — October 2026
              </h3>
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-lg border border-slate-200 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-500">
                      {evt.dateGroupLabel} · {evt.timeLabel}
                    </div>
                    <div className="text-sm font-bold text-[#0f6b3e] mt-0.5">{evt.title}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{evt.courseName}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCalendarModal(false);
                      onOpenCourse(
                        evt.courseId,
                        evt.courseId === 'course-25enh311'
                          ? 'item-cep-retest-quiz'
                          : 'item-sql-db5'
                      );
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#0f6b3e] text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Open Activity
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
