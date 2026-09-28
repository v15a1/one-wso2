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

// Track topics: event-scoped subjects that drive the public agenda's track
// filter. A duplicate slug is a 409 on create and update.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authedDelete, authedGet, authedPost, authedPut } from "@api/http";
import { httpRetry } from "@api/errors";
import { eventPlatformServiceUrls as urls } from "@config/apiConfig";
import { eventPlatformKeys as keys } from "@features/marketing-ops/event-platform/api/queryKeys";
import { useEventPlatformBase } from "@features/marketing-ops/event-platform/api/base";
import { expectBody } from "@features/marketing-ops/event-platform/api/responses";
import { removeById } from "@features/marketing-ops/event-platform/api/cacheUpdates";
import type { TrackTopic } from "@features/marketing-ops/event-platform/types/eventPlatformTypes";

export interface CreateTrackTopicInput {
  configId: string;
  name: string;
  // Derived from the name server side when left out.
  slug?: string;
  position: number;
  // Defaults to true server side; only an explicit false hides the topic.
  showInFilter?: boolean;
}

// Every field optional: a PUT here updates only the fields present.
export interface UpdateTrackTopicInput {
  id: string;
  name?: string;
  slug?: string;
  position?: number;
  showInFilter?: boolean;
}

export function useListTrackTopics(configId: string) {
  const { getAccessToken, ready } = useEventPlatformBase();
  return useQuery<TrackTopic[]>({
    queryKey: keys.trackTopics(configId),
    enabled: ready && Boolean(configId),
    queryFn: async () =>
      authedGet<TrackTopic[]>(urls.eventTrackTopics(configId), await getAccessToken()),
    retry: httpRetry,
  });
}

export function useCreateTrackTopic() {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    // configId goes in the path only. The source also sent it in the body,
    // which the handler's strict binding rejects as an unknown field.
    mutationFn: async ({ configId, name, slug, position, showInFilter }: CreateTrackTopicInput) =>
      expectBody(
        await authedPost<TrackTopic>(urls.eventTrackTopics(configId), await getAccessToken(), {
          name,
          slug,
          position,
          showInFilter,
        }),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.trackTopicsRoot }),
  });
}

// PUT, not the source's PATCH: the backend routes only PUT here, so the
// source's rename always failed.
export function useUpdateTrackTopic() {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, slug, position, showInFilter }: UpdateTrackTopicInput) =>
      expectBody(
        await authedPut<TrackTopic>(urls.trackTopic(id), await getAccessToken(), {
          name,
          slug,
          position,
          showInFilter,
        }),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.trackTopicsRoot }),
  });
}

// References to the topic are nulled server side. The topic lists are patched
// optimistically; sessions and sections are left to their own refetch, as in
// the source.
export function useDeleteTrackTopic() {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => authedDelete(urls.trackTopic(id), await getAccessToken()),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: keys.trackTopicsRoot });
      const snapshots = qc.getQueriesData<TrackTopic[]>({ queryKey: keys.trackTopicsRoot });
      qc.setQueriesData<TrackTopic[]>({ queryKey: keys.trackTopicsRoot }, (old) =>
        old ? removeById(old, id) : old,
      );
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.trackTopicsRoot }),
  });
}
