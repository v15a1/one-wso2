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

// One event: read, upsert (its fields and days together), delete, and its
// JSON exports.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authedDelete, authedGet, authedPut } from "@api/http";
import { httpRetry } from "@api/errors";
import { eventPlatformServiceUrls as urls } from "@config/apiConfig";
import { eventPlatformKeys as keys } from "@features/marketing-ops/event-platform/api/queryKeys";
import { useEventPlatformBase } from "@features/marketing-ops/event-platform/api/base";
import { expectBody } from "@features/marketing-ops/event-platform/api/responses";
import { downloadEventPlatformFile } from "@features/marketing-ops/event-platform/api/download";
import { removeById } from "@features/marketing-ops/event-platform/api/cacheUpdates";
import type { DaySpec } from "@features/marketing-ops/event-platform/api/events";
import type { ConferenceConfig } from "@features/marketing-ops/event-platform/types/eventPlatformTypes";

export interface UpsertEventPayload {
  name: string;
  startDate: string;
  // The FULL day list, matched to the stored days by position: day N keeps its
  // id (and its tracks), and a shorter list deletes the trailing days and
  // unschedules their sessions.
  days: DaySpec[];
  articleLinksEnabled: boolean;
  videoLinksEnabled: boolean;
  artifactLabels: string[];
  defaultInternalLogoUrl?: string | null;
  timezone: string;
  venueName?: string | null;
  venueAddress?: string | null;
  shopClosingTime?: string | null;
  // Required here though the source never sent it: the upsert writes every
  // column, so omitting it set the keynote room to NULL on each Settings save
  // and silently undid the room-mapping screen. Pass the event's current value
  // through unless the form is changing it.
  keynoteRoomId: string | null;
}

export function useEvent(eventId: string) {
  const { getAccessToken, ready } = useEventPlatformBase();
  return useQuery<ConferenceConfig>({
    queryKey: keys.event(eventId),
    enabled: ready && Boolean(eventId),
    queryFn: async () => authedGet<ConferenceConfig>(urls.event(eventId), await getAccessToken()),
    // A bad or deleted id should say so at once, not after a retry.
    retry: false,
  });
}

export function useUpsertEvent(eventId: string) {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpsertEventPayload) =>
      expectBody(
        await authedPut<ConferenceConfig>(urls.event(eventId), await getAccessToken(), payload),
      ),
    onSuccess: (updated) => {
      qc.setQueryData(keys.event(eventId), updated);
      // Replacing the days can drop some, which unplaces their sessions.
      qc.invalidateQueries({ queryKey: keys.days });
      qc.invalidateQueries({ queryKey: keys.sessionsRoot });
      // Not in the source, which left the list showing the old name.
      qc.invalidateQueries({ queryKey: keys.events });
    },
  });
}

export function useDeleteEvent() {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) =>
      authedDelete(urls.event(eventId), await getAccessToken()),
    onSuccess: (_data, eventId) => {
      qc.setQueryData<ConferenceConfig[]>(keys.events, (old = []) => removeById(old, eventId));
      qc.removeQueries({ queryKey: keys.event(eventId) });
    },
  });
}

export function useDownloadAgenda(eventId: string) {
  const { getAccessToken } = useEventPlatformBase();
  return useMutation({
    mutationFn: async () =>
      downloadEventPlatformFile(urls.exportAgenda(eventId), await getAccessToken(), "agenda.json"),
  });
}

// `roles` is the comma list the export filters speakers by; omitted, the
// server exports internal and external speakers.
export function useDownloadSpeakers(eventId: string) {
  const { getAccessToken } = useEventPlatformBase();
  return useMutation({
    mutationFn: async (roles?: string) =>
      downloadEventPlatformFile(
        urls.exportSpeakers(eventId, roles),
        await getAccessToken(),
        "speakers.json",
      ),
  });
}

// The previews are the same exports, parsed. Typed `unknown` as in the source:
// the Export screen only pretty-prints them, and the static HTML build (phase 7)
// hands the agenda to the template's runtime as-is.
export function useAgendaPreview(eventId: string) {
  const { getAccessToken, ready } = useEventPlatformBase();
  return useQuery<unknown>({
    queryKey: keys.exportAgenda(eventId),
    enabled: ready && Boolean(eventId),
    queryFn: async () => authedGet<unknown>(urls.exportAgenda(eventId), await getAccessToken()),
    retry: httpRetry,
  });
}

export function useSpeakersPreview(eventId: string) {
  const { getAccessToken, ready } = useEventPlatformBase();
  return useQuery<unknown>({
    queryKey: keys.exportSpeakers(eventId),
    enabled: ready && Boolean(eventId),
    queryFn: async () => authedGet<unknown>(urls.exportSpeakers(eventId), await getAccessToken()),
    retry: httpRetry,
  });
}
