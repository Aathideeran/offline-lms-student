/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ChatMessage,
  Course,
  PendingSyncMutation,
  UpcomingEvent,
} from '../types/lms';

export type TimelineFilterMode = 'all' | 'overdue' | 'next_7_days' | 'next_30_days';
export type TimelineSortMode = 'dates' | 'courses';

export function filterAndSortTimelineEvents(
  events: UpcomingEvent[],
  options: {
    filterMode: TimelineFilterMode;
    sortMode: TimelineSortMode;
    searchQuery: string;
    referenceDateIso?: string;
  }
): UpcomingEvent[] {
  const {
    filterMode,
    sortMode,
    searchQuery,
    referenceDateIso = '2026-10-27T00:53:46',
  } = options;

  const refTime = new Date(referenceDateIso).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filtered = events.filter((evt) => {
    const dueTime = new Date(evt.dueDateIso).getTime();
    if (filterMode === 'overdue' && dueTime >= refTime) return false;
    if (filterMode === 'next_7_days' && (dueTime < refTime || dueTime > refTime + 7 * dayMs)) {
      return false;
    }
    if (filterMode === 'next_30_days' && (dueTime < refTime || dueTime > refTime + 30 * dayMs)) {
      return false;
    }

    if (normalizedSearch.length > 0) {
      const hay = `${evt.title} ${evt.courseName} ${evt.activityType} ${evt.actionLabel}`.toLowerCase();
      if (!hay.includes(normalizedSearch)) return false;
    }

    return true;
  });

  filtered.sort((a, b) => {
    if (sortMode === 'courses') {
      const cmp = a.courseName.localeCompare(b.courseName);
      if (cmp !== 0) return cmp;
    }
    return new Date(a.dueDateIso).getTime() - new Date(b.dueDateIso).getTime();
  });

  return filtered;
}

export function calculateCourseCompletionStats(course: Course): {
  completedCount: number;
  totalCount: number;
  percent: number;
  localModifiedCount: number;
} {
  let completedCount = 0;
  let totalCount = 0;
  let localModifiedCount = 0;

  for (const section of course.sections) {
    for (const item of section.items) {
      totalCount++;
      if (item.done) completedCount++;
      if (item.syncState === 'local_modified') localModifiedCount++;
    }
  }

  const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  return { completedCount, totalCount, percent, localModifiedCount };
}

export function appendAndSortChatHistory(
  existing: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const msg of existing) {
    byId.set(msg.id, msg);
  }
  for (const msg of incoming) {
    byId.set(msg.id, msg);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function preserveMutationsOnOfflineSyncFailure(
  mutations: PendingSyncMutation[],
  errorDetail: string
): PendingSyncMutation[] {
  return mutations.map((m) => ({
    ...m,
    status: 'sync_failed_offline',
    lastError: errorDetail,
  }));
}
