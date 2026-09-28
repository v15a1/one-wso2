// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

// Pure list and session transforms behind the hooks' optimistic cache writes.
// Kept out of the hooks so the rules — which lists a session belongs in, what
// "unplaced" means — are testable without a QueryClient.

import type {
  Session,
  SessionFilters,
} from "@features/marketing-ops/event-platform/types/eventPlatformTypes";

export function replaceById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.map((x) => (x.id === item.id ? item : x));
}

export function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((x) => x.id !== id);
}

// Mirrors the backend's list query: same event, same day when one is asked
// for, and `scheduled` meaning "has a day" (sessions.day_id IS [NOT] NULL).
export function sessionMatchesFilters(session: Session, filters: SessionFilters): boolean {
  if (session.configId !== filters.configId) return false;
  if (filters.dayId && session.dayId !== filters.dayId) return false;
  if (filters.scheduled !== undefined && filters.scheduled !== (session.dayId !== null)) {
    return false;
  }
  return true;
}

// The body PUT /api/sessions/{id}/placement takes — these four fields and no
// others (the handler rejects unknown keys, so the source's optional `roomId`
// here is gone: nothing sent it, and it would have been a 400).
export interface Placement {
  dayId: string | null;
  trackId: string | null;
  slotIndex: number | null;
  sectionId: string | null;
}

export const UNPLACED: Placement = { dayId: null, trackId: null, slotIndex: null, sectionId: null };

export function applyPlacement(session: Session, placement: Placement): Session {
  return { ...session, ...placement };
}

// Clears every placement field on the sessions `affected` picks, leaving the
// rest untouched — what deleting a track or section does to what sat in it.
export function unplaceWhere(sessions: Session[], affected: (s: Session) => boolean): Session[] {
  return sessions.map((s) => (affected(s) ? applyPlacement(s, UNPLACED) : s));
}
