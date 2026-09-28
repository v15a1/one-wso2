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

// Timeslot footnotes: short, day-wide notes pinned under one slot of the grid,
// independent of any track. Every hook is bound to one day.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authedDelete, authedGet, authedPatch, authedPost } from "@api/http";
import { httpRetry } from "@api/errors";
import { eventPlatformServiceUrls as urls } from "@config/apiConfig";
import { eventPlatformKeys as keys } from "@features/marketing-ops/event-platform/api/queryKeys";
import {
  useEventPlatformBase,
  useNotifyFailure,
} from "@features/marketing-ops/event-platform/api/base";
import { expectBody } from "@features/marketing-ops/event-platform/api/responses";
import { removeById, replaceById } from "@features/marketing-ops/event-platform/api/cacheUpdates";
import type { TimeslotFootnote } from "@features/marketing-ops/event-platform/types/eventPlatformTypes";

export function useListFootnotes(dayId: string | null) {
  const { getAccessToken, ready } = useEventPlatformBase();
  return useQuery<TimeslotFootnote[]>({
    queryKey: keys.footnotes(dayId ?? ""),
    enabled: ready && Boolean(dayId),
    queryFn: async () =>
      authedGet<TimeslotFootnote[]>(urls.dayFootnotes(dayId!), await getAccessToken()),
    staleTime: Infinity,
    retry: httpRetry,
  });
}

export function useCreateFootnote(dayId: string) {
  const { getAccessToken } = useEventPlatformBase();
  const notifyFailure = useNotifyFailure();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ slotIndex, text }: { slotIndex: number; text: string }) =>
      expectBody(
        await authedPost<TimeslotFootnote>(urls.dayFootnotes(dayId), await getAccessToken(), {
          slotIndex,
          text,
        }),
      ),
    onSuccess: (created) => {
      qc.setQueryData<TimeslotFootnote[]>(keys.footnotes(dayId), (old = []) => [...old, created]);
    },
    onError: (err) => notifyFailure("Couldn't add the footnote.", err),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.footnotes(dayId) }),
  });
}

export function useUpdateFootnote(dayId: string) {
  const { getAccessToken } = useEventPlatformBase();
  const notifyFailure = useNotifyFailure();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, text, slotIndex }: { id: string; text?: string; slotIndex?: number }) =>
      expectBody(
        await authedPatch<TimeslotFootnote>(urls.footnote(id), await getAccessToken(), {
          text,
          slotIndex,
        }),
      ),
    onSuccess: (updated) => {
      qc.setQueryData<TimeslotFootnote[]>(keys.footnotes(dayId), (old = []) =>
        replaceById(old, updated),
      );
    },
    onError: (err) => notifyFailure("Couldn't update the footnote.", err),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.footnotes(dayId) }),
  });
}

export function useDeleteFootnote(dayId: string) {
  const { getAccessToken } = useEventPlatformBase();
  const notifyFailure = useNotifyFailure();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => authedDelete(urls.footnote(id), await getAccessToken()),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: keys.footnotes(dayId) });
      const prev = qc.getQueryData<TimeslotFootnote[]>(keys.footnotes(dayId));
      qc.setQueryData<TimeslotFootnote[]>(keys.footnotes(dayId), (old = []) => removeById(old, id));
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx) qc.setQueryData(keys.footnotes(dayId), ctx.prev);
      notifyFailure("Couldn't delete the footnote — changes reverted.", err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.footnotes(dayId) }),
  });
}
