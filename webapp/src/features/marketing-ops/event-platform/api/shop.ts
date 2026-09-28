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

// Shop inventory for one event. Open to admins and shop operators alike.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authedDelete, authedGet, authedPost, authedPut } from "@api/http";
import { httpRetry } from "@api/errors";
import { eventPlatformServiceUrls as urls } from "@config/apiConfig";
import { eventPlatformKeys as keys } from "@features/marketing-ops/event-platform/api/queryKeys";
import { useEventPlatformBase } from "@features/marketing-ops/event-platform/api/base";
import { expectBody } from "@features/marketing-ops/event-platform/api/responses";
import { removeById, replaceById } from "@features/marketing-ops/event-platform/api/cacheUpdates";
import { toShopItemBody, type ShopItemInput } from "@features/marketing-ops/event-platform/api/payloads";
import type { ShopItem } from "@features/marketing-ops/event-platform/types/eventPlatformTypes";

export function useListShopItems(eventId: string) {
  const { getAccessToken, ready } = useEventPlatformBase();
  return useQuery<ShopItem[]>({
    queryKey: keys.shopItems(eventId),
    enabled: ready && Boolean(eventId),
    queryFn: async () => authedGet<ShopItem[]>(urls.shopItems(eventId), await getAccessToken()),
    retry: httpRetry,
  });
}

export function useCreateShopItem(eventId: string) {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ShopItemInput) =>
      expectBody(
        await authedPost<ShopItem>(urls.shopItems(eventId), await getAccessToken(), toShopItemBody(input)),
      ),
    onSuccess: (created) => {
      qc.setQueryData<ShopItem[]>(keys.shopItems(eventId), (old = []) => [...old, created]);
    },
  });
}

export function useUpdateShopItem(eventId: string) {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ShopItemInput & { id: string }) =>
      expectBody(
        await authedPut<ShopItem>(urls.shopItem(eventId, id), await getAccessToken(), toShopItemBody(input)),
      ),
    onSuccess: (updated) => {
      qc.setQueryData<ShopItem[]>(keys.shopItems(eventId), (old = []) => replaceById(old, updated));
    },
  });
}

export function useDeleteShopItem(eventId: string) {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => authedDelete(urls.shopItem(eventId, id), await getAccessToken()),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: keys.shopItems(eventId) });
      const previous = qc.getQueryData<ShopItem[]>(keys.shopItems(eventId));
      qc.setQueryData<ShopItem[]>(keys.shopItems(eventId), (old = []) => removeById(old, id));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) qc.setQueryData(keys.shopItems(eventId), ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.shopItems(eventId) }),
  });
}
