/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LayoutGrid, List, Search } from 'lucide-react';
import { Course, LocalDocument } from '../types/lms';
import { CourseBanner } from './CourseBanner';
import { calculateCourseCompletionStats } from '../utils/lmsLogic';

interface MyCoursesViewProps {
  courses: Course[];
  documents: LocalDocument[];
  onOpenCourse: (courseId: string) => void;
  onOpenMaterialManager: () => void;
}

export const MyCoursesView: React.FC<MyCoursesViewProps> = ({
  courses,
  documents,
  onOpenCourse,
  onOpenMaterialManager,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'last_accessed' | 'title'>('last_accessed');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  const filtered = courses
    .filter((c) => {
      const stats = calculateCourseCompletionStats(c);
      if (statusFilter === 'completed' && stats.percent < 100) return false;
      if (statusFilter === 'in_progress' && stats.percent === 100) return false;

      if (search.trim().length > 0) {
        const hay = `${c.title} ${c.code} ${c.category}`.toLowerCase();
        if (!hay.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime();
    });

  return (
    <main className="w-full max-w-[850px] mx-auto px-4 sm:px-6 pt-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[26px] font-bold text-[#1d2125]">My courses</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sample baseline courses cached in IndexedDB · Clearly labeled until authorized college
            LMS data is connected
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenMaterialManager}
          className="self-start sm:self-center px-3.5 py-2 rounded-lg border border-[#0f6b3e]/40 text-xs font-semibold text-[#0f6b3e] hover:bg-emerald-50/50 whitespace-nowrap shrink-0 cursor-pointer"
        >
          Manage Course Materials ({documents.length} stored)
        </button>
      </div>

      <section
        aria-labelledby="course-overview-heading"
        className="bg-white border border-[#dee2e6] rounded-[10px] p-5 sm:p-6"
      >
        <h2 id="course-overview-heading" className="text-[16.5px] font-bold text-[#1d2125] mb-4">
          Course overview
        </h2>

        {/* Filter, Search, Sort, and Card/List Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-5 border-b border-[#e9ecef]">
          <div className="flex flex-wrap items-center gap-2.5">
            <div>
              <label htmlFor="course-status-filter" className="sr-only">
                Filter courses by completion status
              </label>
              <select
                id="course-status-filter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'all' | 'in_progress' | 'completed')
                }
                className="h-[36px] px-3 rounded-[6px] border border-[#ced4da] bg-white text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f6b3e] cursor-pointer"
              >
                <option value="all">All</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="w-full sm:w-56">
              <label htmlFor="my-courses-search" className="sr-only">
                Search courses
              </label>
              <input
                id="my-courses-search"
                type="search"
                placeholder="Search courses"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-[36px] px-3 rounded-[6px] border border-[#ced4da] bg-white text-[13px] text-slate-800 placeholder:text-[#6a737b] focus:outline-none focus:ring-2 focus:ring-[#0f6b3e]"
              />
            </div>

            <div>
              <label htmlFor="course-sort-select" className="sr-only">
                Sort courses
              </label>
              <select
                id="course-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'last_accessed' | 'title')}
                className="h-[36px] px-3 rounded-[6px] border border-[#ced4da] bg-white text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f6b3e] cursor-pointer"
              >
                <option value="last_accessed">Sort by last accessed</option>
                <option value="title">Sort by course name</option>
              </select>
            </div>
          </div>

          <div className="inline-flex items-center border border-[#ced4da] rounded-[6px] overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setViewMode('card')}
              aria-label="Card view"
              className={`px-2.5 h-[34px] flex items-center gap-1 text-xs cursor-pointer ${
                viewMode === 'card'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Card</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`px-2.5 h-[34px] flex items-center gap-1 text-xs border-l border-[#ced4da] cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center">
            <Search className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">
              No courses match your current filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}
              className="mt-3 px-3.5 py-1.5 rounded-md border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Reset Course Filters
            </button>
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {filtered.map((course) => {
              const stats = calculateCourseCompletionStats(course);
              const docCount = documents.filter((d) => d.courseId === course.id).length;
              return (
                <div
                  key={course.id}
                  className="group border border-[#dee2e6] rounded-[8px] overflow-hidden bg-white flex flex-col hover:border-[#0f6b3e]/60 transition"
                >
                  <button
                    type="button"
                    onClick={() => onOpenCourse(course.id)}
                    className="text-left w-full flex-1 flex flex-col cursor-pointer"
                  >
                    <div className="h-[108px] w-full overflow-hidden">
                      <CourseBanner pattern={course.bannerPattern} />
                    </div>
                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-[13.5px] font-medium text-[#0f6b3e] group-hover:underline">
                          {course.title}
                        </div>
                        <div className="text-[12px] text-[#6a737b] mt-0.5">
                          {course.category} · {course.code}
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                        <div className="flex items-center justify-between font-mono tabular-nums">
                          <span>{stats.percent}% complete</span>
                          <span>
                            {stats.completedCount}/{stats.totalCount} done
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Sample Baseline</span>
                          <span>{docCount} local doc(s)</span>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-[#e9ecef]">
            {filtered.map((course) => {
              const stats = calculateCourseCompletionStats(course);
              const docCount = documents.filter((d) => d.courseId === course.id).length;
              return (
                <div
                  key={course.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-24 h-14 rounded-md overflow-hidden shrink-0 border border-slate-200">
                      <CourseBanner pattern={course.bannerPattern} />
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpenCourse(course.id)}
                        className="text-left text-sm font-bold text-[#0f6b3e] hover:underline truncate block cursor-pointer"
                      >
                        {course.title}
                      </button>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {course.category} · Code: {course.code} · {course.sections.length} section(s)
                        · {docCount} local material(s)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-xs font-mono tabular-nums text-slate-700">
                      <div>{stats.percent}% complete</div>
                      <div className="text-[11px] text-slate-500">
                        {stats.completedCount}/{stats.totalCount} items
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenCourse(course.id)}
                      className="px-3 py-1.5 rounded-md border border-[#ced4da] text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Open course
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};
