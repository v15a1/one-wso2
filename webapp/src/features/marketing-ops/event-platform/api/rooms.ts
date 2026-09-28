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

// Rooms, the keynote room mapping, and the "reapply rooms" sweep.

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { authedDelete, authedGet, authedPatch, authedPost, authedPut } from "@api/http";
import { httpRetry } from "@api/errors";
import { eventPlatformServiceUrls as urls } from "@config/apiConfig";
import { eventPlatformKeys as keys } from "@features/marketing-ops/event-platform/api/queryKeys";
import {
  useEventPlatformBase,
  useNotifyFailure,
} from "@features/marketing-ops/event-platform/api/base";
import { expectBody } from "@features/marketing-ops/event-platform/api/responses";
import { removeById, replaceById } from "@features/marketing-ops/event-platform/api/cacheUpdates";
import type { ColorToken } from "@features/marketing-ops/event-platform/types/colorTokens";
import type { Room, RoomMappings } from "@features/marketing-ops/event-platform/types/eventPlatformTypes";

// Room writes reassign session rooms on the backend as a side effect (tracks
// and sections point at rooms, and deleting one falls back through the mapping
// chain), so every room mutation invalidates sessions and tracks alongside
// rooms. Rooms itself is included too: onSuccess patches only the cache it
// knows, so two overlapping edits to one room (a colour picked twice before the
// first PATCH resolves) could leave the earlier response on top — this refetch
// is what heals that.
function invalidateRoomSideEffects(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: keys.sessionsRoot });
  qc.invalidateQueries({ queryKey: keys.tracksRoot });
  qc.invalidateQueries({ queryKey: keys.roomsRoot });
}

// Rooms belong to one event: every name ("Blue Room", "Registration") repeats
// across events with its own row and colour, and an unscoped list returns all
// of them. So configId is required here, though the endpoint allows none.
export function useListRooms(configId: string) {
  const { getAccessToken, ready } = useEventPlatformBase();
  return useQuery<Room[]>({
    queryKey: keys.rooms(configId),
    enabled: ready && Boolean(configId),
    queryFn: async () => authedGet<Room[]>(urls.roomsForEvent(configId), await getAccessToken()),
    retry: httpRetry,
  });
}

export function useCreateRoom() {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { configId: string; name: string; colorToken?: ColorToken | null }) =>
      expectBody(await authedPost<Room>(urls.rooms, await getAccessToken(), input)),
    onSuccess: (created) => {
      qc.setQueryData<Room[]>(keys.rooms(created.configId), (old = []) => [...old, created]);
    },
    onSettled: () => invalidateRoomSideEffects(qc),
  });
}

export function useUpdateRoom() {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    // `colorToken` is tri-state on the server: left out = untouched, null =
    // cleared back to the track's colour.
    mutationFn: async ({ id, name, colorToken }: { id: string; name?: string; colorToken?: ColorToken | null }) =>
      expectBody(await authedPatch<Room>(urls.room(id), await getAccessToken(), { name, colorToken })),
    onSuccess: (updated) => {
      qc.setQueryData<Room[]>(keys.rooms(updated.configId), (old = []) => replaceById(old, updated));
    },
    onSettled: () => invalidateRoomSideEffects(qc),
  });
}

export function useDeleteRoom() {
  const { getAccessToken } = useEventPlatformBase();
  const notifyFailure = useNotifyFailure();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; configId: string }) =>
      authedDelete(urls.room(id), await getAccessToken()),
    onMutate: async ({ id, configId }) => {
      await qc.cancelQueries({ queryKey: keys.rooms(configId) });
      const previous = qc.getQueryData<Room[]>(keys.rooms(configId));
      qc.setQueryData<Room[]>(keys.rooms(configId), (old = []) => removeById(old, id));
      return { previous };
    },
    onError: (err, { configId }, ctx) => {
      qc.setQueryData(keys.rooms(configId), ctx?.previous);
      notifyFailure("Couldn't delete the room — changes reverted.", err);
    },
    onSettled: () => invalidateRoomSideEffects(qc),
  });
}

export function useRoomMappings(configId: string | undefined) {
  const { getAccessToken, ready } = useEventPlatformBase();
  return useQuery<RoomMappings>({
    queryKey: keys.roomMappings(configId ?? ""),
    enabled: ready && Boolean(configId),
    queryFn: async () =>
      authedGet<RoomMappings>(urls.roomMappingsForEvent(configId!), await getAccessToken()),
    retry: httpRetry,
  });
}

export function useUpdateRoomMappings() {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { configId: string; keynoteRoomId: string | null }) =>
      expectBody(await authedPut<RoomMappings>(urls.roomMappings, await getAccessToken(), input)),
    onSuccess: (updated, { configId }) => {
      qc.setQueryData(keys.roomMappings(configId), updated);
    },
    onSettled: (_data, _err, { configId }) => {
      qc.invalidateQueries({ queryKey: keys.roomMappings(configId) });
      // The keynote room is also a field on the event, which Settings upserts
      // whole — refresh it so the next save carries the new value.
      qc.invalidateQueries({ queryKey: keys.event(configId) });
      invalidateRoomSideEffects(qc);
    },
  });
}

// Re-derives every non-overridden session's room from the current mappings.
// Answers with how many sessions changed.
export function useReapplyRooms() {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ configId }: { configId: string }) =>
      expectBody(
        await authedPost<{ sessionsUpdated: number }>(urls.roomsReapply, await getAccessToken(), {
          configId,
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.sessionsRoot }),
  });
}
