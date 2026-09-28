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

// The events list and event creation. One event's own reads and writes are in
// ./event.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authedGet, authedPost } from "@api/http";
import { httpRetry } from "@api/errors";
import { eventPlatformServiceUrls as urls } from "@config/apiConfig";
import { eventPlatformKeys as keys } from "@features/marketing-ops/event-platform/api/queryKeys";
import { useEventPlatformBase } from "@features/marketing-ops/event-platform/api/base";
import { expectBody } from "@features/marketing-ops/event-platform/api/responses";
import type { ConferenceConfig } from "@features/marketing-ops/event-platform/types/eventPlatformTypes";

// A day as the create and upsert bodies carry it: its window and label only.
// The server assigns ids, dates and offsets from the event's start date.
export interface DaySpec {
  startMinute: number;
  endMinute: number;
  label?: string | null;
}

export interface CreateEventPayload {
  name: string;
  startDate: string;
  days: DaySpec[];
  timezone: string;
  venueName?: string | null;
  venueAddress?: string | null;
}

// Open to any app member on the backend, shop operators included — see §8 Q1
// of the spec for why a shop-only user may yet be shown this list.
export function useListEvents() {
  const { getAccessToken, ready } = useEventPlatformBase();
  return useQuery<ConferenceConfig[]>({
    queryKey: keys.events,
    enabled: ready,
    queryFn: async () => authedGet<ConferenceConfig[]>(urls.events, await getAccessToken()),
    retry: httpRetry,
  });
}

export function useCreateEvent() {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateEventPayload) =>
      expectBody(await authedPost<ConferenceConfig>(urls.events, await getAccessToken(), payload)),
    onSuccess: (created) => {
      qc.setQueryData<ConferenceConfig[]>(keys.events, (old = []) => [...old, created]);
    },
  });
}
