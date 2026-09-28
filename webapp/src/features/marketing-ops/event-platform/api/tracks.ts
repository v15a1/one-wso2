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

// Tracks: the columns of a day's agenda grid.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import type { ColorToken } from "@features/marketing-ops/event-platform/types/colorTokens";
import type {
  Session,
  Track,
  TrackSection,
} from "@features/marketing-ops/event-platform/types/eventPlatformTypes";

// Every event's tracks, for the room-mapping tree. No server filter exists.
export function useAllTracks() {
  const { getAccessToken, ready } = useEventPlatformBase();
  return useQuery<Track[]>({
    queryKey: keys.allTracks,
    enabled: ready,
    queryFn: async () => authedGet<Track[]>(urls.allTracks, await getAccessToken()),
    // The agenda editor is the only writer and patches this cache itself.
    staleTime: Infinity,
    retry: httpRetry,
  });
}

export function useListTracks(dayId: string | undefined) {
  const { getAccessToken, ready } = useEventPlatformBase();
  return useQuery<Track[]>({
    queryKey: keys.tracks(dayId ?? ""),
    enabled: ready && Boolean(dayId),
    queryFn: async () => authedGet<Track[]>(urls.dayTracks(dayId!), await getAccessToken()),
    staleTime: Infinity,
    retry: httpRetry,
  });
}

export interface TrackInput {
  colorToken: ColorToken | null;
  roomId?: string | null;
}

export function useCreateTrack() {
  const { getAccessToken } = useEventPlatformBase();
  const notifyFailure = useNotifyFailure();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dayId, colorToken, roomId }: TrackInput & { dayId: string }) =>
      expectBody(
        await authedPost<Track>(urls.dayTracks(dayId), await getAccessToken(), {
          colorToken,
          roomId: roomId ?? null,
        }),
      ),
    onSuccess: (created, vars) => {
      qc.setQueryData<Track[]>(keys.tracks(vars.dayId), (old = []) => [...old, created]);
      qc.setQueryData<Track[]>(keys.allTracks, (old = []) => [...old, created]);
    },
    onError: (err) => notifyFailure("Couldn't create the track.", err),
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: keys.tracks(vars.dayId) });
      qc.invalidateQueries({ queryKey: keys.allTracks });
      // A track with a room reassigns the rooms of sessions placed in it.
      qc.invalidateQueries({ queryKey: keys.sessionsRoot });
    },
  });
}

export function useUpdateTrack() {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    // dayId only addresses the cache; the item route doesn't take it.
    mutationFn: async ({ id, colorToken, roomId }: TrackInput & { id: string; dayId: string }) =>
      expectBody(
        await authedPatch<Track>(urls.track(id), await getAccessToken(), {
          colorToken,
          roomId: roomId ?? null,
        }),
      ),
    onSuccess: (updated, vars) => {
      qc.setQueryData<Track[]>(keys.tracks(vars.dayId), (old = []) => replaceById(old, updated));
      qc.setQueryData<Track[]>(keys.allTracks, (old = []) => replaceById(old, updated));
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: keys.tracks(vars.dayId) });
      qc.invalidateQueries({ queryKey: keys.allTracks });
    },
  });
}

// Removes the track at once, with its sections and its sessions unplaced, and
// rolls every cache back if the delete fails. Once the delete lands, the
// sessions that sat in the track are unplaced on the server too — one PUT each,
// which counts against the backend's rate limit on a busy track.
export function useDeleteTrack() {
  const { getAccessToken } = useEventPlatformBase();
  const notifyFailure = useNotifyFailure();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; dayId: string }) =>
      authedDelete(urls.track(id), await getAccessToken()),
    onMutate: async ({ id, dayId }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: keys.tracks(dayId) }),
        qc.cancelQueries({ queryKey: keys.allTracks }),
        qc.cancelQueries({ queryKey: keys.sessionsRoot }),
        qc.cancelQueries({ queryKey: keys.trackSections(id) }),
      ]);

      const prevDayTracks = qc.getQueryData<Track[]>(keys.tracks(dayId));
      const prevAllTracks = qc.getQueryData<Track[]>(keys.allTracks);
      const prevSessions = qc.getQueriesData<Session[]>({ queryKey: keys.sessionsRoot });
      const prevTrackSections = qc.getQueryData<TrackSection[]>(keys.trackSections(id));

      // Captured before the optimistic write below wipes their trackId. One
      // session can sit in several cached lists, hence the de-duplication.
      const affected = new Map<string, Session>();
      for (const [, data] of prevSessions) {
        for (const s of data ?? []) if (s.trackId === id) affected.set(s.id, s);
      }

      qc.setQueryData<Track[]>(keys.tracks(dayId), (old = []) => removeById(old, id));
      qc.setQueryData<Track[]>(keys.allTracks, (old = []) => removeById(old, id));
      qc.removeQueries({ queryKey: keys.trackSections(id) });
      qc.setQueriesData<Session[]>({ queryKey: keys.sessionsRoot }, (old) =>
        old ? unplaceWhere(old, (s) => s.trackId === id) : old,
      );

      return {
        prevDayTracks,
        prevAllTracks,
        prevSessions,
        prevTrackSections,
        affectedSessionIds: [...affected.keys()],
      };
    },
    onSuccess: async (_data, _vars, ctx) => {
      if (!ctx?.affectedSessionIds.length) return;
      const token = await getAccessToken();
      await Promise.all(
        ctx.affectedSessionIds.map((sid) => authedPut<Session>(urls.sessionPlacement(sid), token, UNPLACED)),
      );
    },
    onError: (err, { id, dayId }, ctx) => {
      if (ctx) {
        qc.setQueryData(keys.tracks(dayId), ctx.prevDayTracks);
        qc.setQueryData(keys.allTracks, ctx.prevAllTracks);
        ctx.prevSessions.forEach(([key, data]) => qc.setQueryData(key, data));
        qc.setQueryData(keys.trackSections(id), ctx.prevTrackSections);
      }
      notifyFailure("Couldn't delete the track — changes reverted.", err);
    },
    onSettled: (_data, _err, { id, dayId }) => {
      qc.invalidateQueries({ queryKey: keys.tracks(dayId) });
      qc.invalidateQueries({ queryKey: keys.allTracks });
      qc.invalidateQueries({ queryKey: keys.sessionsRoot });
      qc.invalidateQueries({ queryKey: keys.trackSections(id) });
    },
  });
}
