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

// Shop orders for one event. Each order carries the buyer's shipping address
// and email, so none of it goes in a log line or an error message.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authedGet, authedPatch } from "@api/http";
import { httpRetry } from "@api/errors";
import { eventPlatformServiceUrls as urls } from "@config/apiConfig";
import { eventPlatformKeys as keys } from "@features/marketing-ops/event-platform/api/queryKeys";
import { useEventPlatformBase } from "@features/marketing-ops/event-platform/api/base";
import type {
  ShopOrder,
  ShopOrderStatus,
} from "@features/marketing-ops/event-platform/types/eventPlatformTypes";

export function useListShopOrders(eventId: string) {
  const { getAccessToken, ready } = useEventPlatformBase();
  return useQuery<ShopOrder[]>({
    queryKey: keys.shopOrders(eventId),
    enabled: ready && Boolean(eventId),
    queryFn: async () => authedGet<ShopOrder[]>(urls.shopOrders(eventId), await getAccessToken()),
    retry: httpRetry,
  });
}

// Sends `{status}` only. The source also sent `transactionHash`, but the
// handler binds just `status` and rejects unknown keys, so any change that
// carried a hash was a 400. The answer is an empty 200, so the cached order is
// patched from the request rather than from a response.
export function useUpdateShopOrderStatus(eventId: string) {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ShopOrderStatus }) => {
      await authedPatch<null>(urls.shopOrderStatus(eventId, id), await getAccessToken(), { status });
    },
    onSuccess: (_data, { id, status }) => {
      qc.setQueryData<ShopOrder[]>(keys.shopOrders(eventId), (old = []) =>
        old.map((o) => (o.id === id ? { ...o, status } : o)),
      );
    },
  });
}
