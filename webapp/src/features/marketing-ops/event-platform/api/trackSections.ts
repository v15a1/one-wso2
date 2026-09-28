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

// Sections: labelled spans of slots. A track section lives in one track; a
// keynote section spans the whole day. Both are edited and deleted through the
// same `/track-sections/{id}` route, so the update and delete hooks take
// whichever parent the section has to find its cache.

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { authedDelete, authedGet, authedPatch, authedPost, authedPut } from "@api/http";
import { httpRetry } from "@api/errors";
import { eventPlatformServiceUrls as urls } from "@config/apiConfig";
import { eventPlatformKeys as keys } from "@features/marketing-ops/event-platform/api/queryKeys";
import {
  useEventPlatformBase,
  useNotifyFailure,
} from "@features/marketing-ops/event-platform/api/base";
import { expectBody } from "@features/marketing-ops/event-platform/api/responses";
import {
  removeById,
  replaceById,
  UNPLACED,
  unplaceWhere,
} from "@features/marketing-ops/event-platform/api/cacheUpdates";
import {
  toTrackSectionBody,
  toTrackSectionPatch,
  type SectionParent,
  type TrackSectionInput,
  type UpdateTrackSectionInput,
} from "@features/marketing-ops/event-platform/api/payloads";
import type {
  Session,
  Track,
  TrackSection,
} from "@features/marketing-ops/event-platform/types/eventPlatformTypes";

// One request per track — the backend has no "all sections of a day" route.
// Returns the flattened sections; a track still loading contributes none yet.
export function useListAllTrackSections(tracks: Track[]): TrackSection[] {
  const { getAccessToken, ready } = useEventPlatformBase();
  const results = useQueries({
    queries: tracks.map((t) => ({
      queryKey: keys.trackSections(t.id),
      enabled: ready,
      queryFn: async () => authedGet<TrackSection[]>(urls.trackSections(t.id), await getAccessToken()),
      staleTime: Infinity,
      retry: httpRetry,
    })),
  });
  return results.flatMap((r) => r.data ?? []);
}

export function useListTrackSections(trackId: string | undefined) {
  const { getAccessToken, ready } = useEventPlatformBase();
  return useQuery<TrackSection[]>({
    queryKey: keys.trackSections(trackId ?? ""),
    enabled: ready && Boolean(trackId),
    queryFn: async () =>
      authedGet<TrackSection[]>(urls.trackSections(trackId!), await getAccessToken()),
    staleTime: Infinity,
    retry: httpRetry,
  });
}

export function useListKeynoteSections(dayId: string | undefined) {
  const { getAccessToken, ready } = useEventPlatformBase();
  return useQuery<TrackSection[]>({
    queryKey: keys.keynoteSections(dayId ?? ""),
    enabled: ready && Boolean(dayId),
    queryFn: async () =>
      authedGet<TrackSection[]>(urls.dayKeynoteSections(dayId!), await getAccessToken()),
    staleTime: Infinity,
    retry: httpRetry,
  });
}

export function useCreateTrackSection() {
  const { getAccessToken } = useEventPlatformBase();
  const notifyFailure = useNotifyFailure();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ trackId, ...input }: TrackSectionInput & { trackId: string }) =>
      expectBody(
        await authedPost<TrackSection>(
          urls.trackSections(trackId),
          await getAccessToken(),
          toTrackSectionBody(input),
        ),
      ),
    onSuccess: (created, vars) => {
      qc.setQueryData<TrackSection[]>(keys.trackSections(vars.trackId), (old = []) => [
        ...old,
        created,
      ]);
    },
    onError: (err) => notifyFailure("Couldn't create the section.", err),
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: keys.trackSections(vars.trackId) });
      // A section created with a room of its own reassigns the sessions that
      // land in it, the same way editing one does.
      qc.invalidateQueries({ queryKey: keys.sessionsRoot });
    },
  });
}

export function useCreateKeynoteSection() {
  const { getAccessToken } = useEventPlatformBase();
  const notifyFailure = useNotifyFailure();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dayId, ...input }: TrackSectionInput & { dayId: string }) =>
      expectBody(
        await authedPost<TrackSection>(
          urls.dayKeynoteSections(dayId),
          await getAccessToken(),
          toTrackSectionBody(input),
        ),
      ),
    onSuccess: (created, vars) => {
      qc.setQueryData<TrackSection[]>(keys.keynoteSections(vars.dayId), (old = []) => [
        ...old,
        created,
      ]);
    },
    onError: (err) => notifyFailure("Couldn't create the keynote section.", err),
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: keys.keynoteSections(vars.dayId) });
    },
  });
}

export function useUpdateTrackSection() {
  const { getAccessToken } = useEventPlatformBase();
  const notifyFailure = useNotifyFailure();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateTrackSectionInput) =>
      expectBody(
        await authedPatch<TrackSection>(
          urls.trackSection(input.id),
          await getAccessToken(),
          toTrackSectionPatch(input),
        ),
      ),
    onSuccess: (updated, vars) => {
      if (vars.trackId) {
        qc.setQueryData<TrackSection[]>(keys.trackSections(vars.trackId), (old = []) =>
          replaceById(old, updated),
        );
      } else if (vars.dayId) {
        qc.setQueryData<TrackSection[]>(keys.keynoteSections(vars.dayId), (old = []) =>
          replaceById(old, updated),
        );
      }
    },
    onError: (err) => notifyFailure("Couldn't update the section.", err),
    onSettled: (_data, _err, vars) => {
      if (vars.trackId) qc.invalidateQueries({ queryKey: keys.trackSections(vars.trackId) });
      if (vars.dayId) qc.invalidateQueries({ queryKey: keys.keynoteSections(vars.dayId) });
      // A section's room can override its track's, so a room edit here
      // reassigns the sessions placed in it on the backend.
      qc.invalidateQueries({ queryKey: keys.sessionsRoot });
    },
  });
}

// Unplaces the section's sessions FIRST, then deletes it — the reverse of a
// track delete, as in the source. The caller passes the session ids, since it
// is the one holding the day's sessions.
export function useDeleteTrackSection() {
  const { getAccessToken } = useEventPlatformBase();
  const notifyFailure = useNotifyFailure();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, sessionIds = [] }: SectionParent & { id: string; sessionIds?: string[] }) => {
      const token = await getAccessToken();
      await Promise.all(
        sessionIds.map((sid) => authedPut<Session>(urls.sessionPlacement(sid), token, UNPLACED)),
      );
      await authedDelete(urls.trackSection(id), token);
    },
    onMutate: async ({ id, trackId, dayId }) => {
      await Promise.all([
        trackId ? qc.cancelQueries({ queryKey: keys.trackSections(trackId) }) : undefined,
        dayId ? qc.cancelQueries({ queryKey: keys.keynoteSections(dayId) }) : undefined,
        qc.cancelQueries({ queryKey: keys.sessionsRoot }),
      ]);

      const prev = trackId
        ? qc.getQueryData<TrackSection[]>(keys.trackSections(trackId))
        : qc.getQueryData<TrackSection[]>(keys.keynoteSections(dayId ?? ""));
      const prevSessions = qc.getQueriesData<Session[]>({ queryKey: keys.sessionsRoot });

      if (trackId) {
        qc.setQueryData<TrackSection[]>(keys.trackSections(trackId), (old = []) => removeById(old, id));
      }
      if (dayId) {
        qc.setQueryData<TrackSection[]>(keys.keynoteSections(dayId), (old = []) => removeById(old, id));
      }
      qc.setQueriesData<Session[]>({ queryKey: keys.sessionsRoot }, (old) =>
        old ? unplaceWhere(old, (s) => s.sectionId === id) : old,
      );

      return { prev, prevSessions };
    },
    onError: (err, { trackId, dayId }, ctx) => {
      if (ctx) {
        if (trackId) qc.setQueryData(keys.trackSections(trackId), ctx.prev);
        if (dayId) qc.setQueryData(keys.keynoteSections(dayId), ctx.prev);
        ctx.prevSessions.forEach(([key, data]) => qc.setQueryData(key, data));
      }
      notifyFailure("Couldn't delete the section — changes reverted.", err);
    },
    onSettled: (_data, _err, { trackId, dayId }) => {
      if (trackId) qc.invalidateQueries({ queryKey: keys.trackSections(trackId) });
      if (dayId) qc.invalidateQueries({ queryKey: keys.keynoteSections(dayId) });
      qc.invalidateQueries({ queryKey: keys.sessionsRoot });
    },
  });
}
