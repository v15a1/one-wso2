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

// Every Event Platform query key, in one place, so a mutation's invalidation
// and the query it means to refresh cannot drift apart.
//
// Rooted at ["marketing-ops", "event-platform"] so none of these can collide
// with the unrelated marketing-ops `events` feature (["marketing-ops",
// "events", …]) in the one shared QueryClient. Below the root the shape is the
// source's, because its invalidation leans on prefixes: `tracksRoot` covers
// both a day's tracks and `allTracks`; `sessionsRoot` covers every filtered
// session list at once.

import type { SessionFilters } from "@features/marketing-ops/event-platform/types/eventPlatformTypes";

const ROOT = ["marketing-ops", "event-platform"] as const;

export const eventPlatformKeys = {
  all: ROOT,
  events: [...ROOT, "events"] as const,
  // "event" is NOT a prefix of "events": invalidating the list leaves an open
  // event's own cache alone, and the other way round.
  event: (id: string) => [...ROOT, "event", id] as const,
  // Every event's days (the endpoint is unscoped).
  days: [...ROOT, "days"] as const,
  tracksRoot: [...ROOT, "tracks"] as const,
  tracks: (dayId: string) => [...ROOT, "tracks", dayId] as const,
  allTracks: [...ROOT, "tracks", "all"] as const,
  trackSectionsRoot: [...ROOT, "track-sections"] as const,
  trackSections: (trackId: string) => [...ROOT, "track-sections", trackId] as const,
  keynoteSections: (dayId: string) => [...ROOT, "keynote-sections", dayId] as const,
  footnotes: (dayId: string) => [...ROOT, "footnotes", dayId] as const,
  trackTopicsRoot: [...ROOT, "track-topics"] as const,
  trackTopics: (configId: string) => [...ROOT, "track-topics", configId] as const,
  sessionsRoot: [...ROOT, "sessions"] as const,
  // The filters object sits in the key as-is; TanStack hashes it with sorted
  // keys and drops undefined values, so `{configId}` and `{configId, dayId:
  // undefined}` are the same list.
  sessions: (filters: SessionFilters) => [...ROOT, "sessions", filters] as const,
  speakers: [...ROOT, "speakers"] as const,
  roomsRoot: [...ROOT, "rooms"] as const,
  rooms: (configId: string) => [...ROOT, "rooms", configId] as const,
  roomMappings: (configId: string) => [...ROOT, "room-mappings", configId] as const,
  activitiesRoot: [...ROOT, "activities"] as const,
  activities: (configId: string) => [...ROOT, "activities", configId] as const,
  shopItems: (eventId: string) => [...ROOT, "shop-items", eventId] as const,
  shopOrders: (eventId: string) => [...ROOT, "shop-orders", eventId] as const,
  exportAgenda: (eventId: string) => [...ROOT, "export", "agenda", eventId] as const,
  exportSpeakers: (eventId: string) => [...ROOT, "export", "speakers", eventId] as const,
};

// The filters a cached session list was fetched with, read back off its key —
// for optimistic writes that must touch only the lists a session belongs in.
export function sessionFiltersOf(queryKey: readonly unknown[]): SessionFilters | undefined {
  const filters = queryKey[eventPlatformKeys.sessionsRoot.length];
  return filters && typeof filters === "object" ? (filters as SessionFilters) : undefined;
}
