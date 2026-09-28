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

// Conference days. Read-only here: days are edited through the event upsert
// (./event), and the standalone day create/update/delete routes the source
// wrapped are not ported — no screen called them.

import { useQuery } from "@tanstack/react-query";
import { authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { eventPlatformServiceUrls as urls } from "@config/apiConfig";
import { eventPlatformKeys as keys } from "@features/marketing-ops/event-platform/api/queryKeys";
import { useEventPlatformBase } from "@features/marketing-ops/event-platform/api/base";
import type { ConferenceDay } from "@features/marketing-ops/event-platform/types/eventPlatformTypes";

// Every event's days — the endpoint has no filter. Callers narrow by
// `configId`; one event's own days also come with useEvent.
export function useListDays() {
  const { getAccessToken, ready } = useEventPlatformBase();
  return useQuery<ConferenceDay[]>({
    queryKey: keys.days,
    enabled: ready,
    queryFn: async () => authedGet<ConferenceDay[]>(urls.days, await getAccessToken()),
    retry: httpRetry,
  });
}
