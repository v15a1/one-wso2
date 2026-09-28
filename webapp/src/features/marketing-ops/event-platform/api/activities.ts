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

// Venue activities and their open windows.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authedDelete, authedGet, authedPost, authedPut } from "@api/http";
import { httpRetry } from "@api/errors";
import { eventPlatformServiceUrls as urls } from "@config/apiConfig";
import { eventPlatformKeys as keys } from "@features/marketing-ops/event-platform/api/queryKeys";
import { useEventPlatformBase } from "@features/marketing-ops/event-platform/api/base";
import { expectBody } from "@features/marketing-ops/event-platform/api/responses";
import type {
  Activity,
  ActivityHours,
} from "@features/marketing-ops/event-platform/types/eventPlatformTypes";

// The windows as the form holds them, before the server assigns row ids.
export type ActivityHoursInput = Pick<ActivityHours, "dayId" | "startMinute" | "endMinute">;

export function useListActivities(configId: string) {
  const { getAccessToken, ready } = useEventPlatformBase();
  return useQuery<Activity[]>({
    queryKey: keys.activities(configId),
    enabled: ready && Boolean(configId),
    queryFn: async () => authedGet<Activity[]>(urls.eventActivities(configId), await getAccessToken()),
    retry: httpRetry,
  });
}

// Creates the activity without hours — the backend takes the schedule only
// through useReplaceActivityHours, so creating the amenity and deciding when it
// opens are two steps rather than one payload that can half-fail.
export function useCreateActivity() {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    // configId addresses the event in the path and stays out of the body: the
    // handler rejects unknown keys.
    mutationFn: async ({ configId, name, description, position }: {
      configId: string;
      name: string;
      description: string;
      position: number;
    }) =>
      expectBody(
        await authedPost<Activity>(urls.eventActivities(configId), await getAccessToken(), {
          name,
          description,
          position,
        }),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.activitiesRoot }),
  });
}

export function useUpdateActivity() {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    // A PUT that updates only the fields present.
    mutationFn: async ({ id, name, description, position }: {
      id: string;
      name?: string;
      description?: string;
      position?: number;
    }) =>
      expectBody(
        await authedPut<Activity>(urls.activity(id), await getAccessToken(), {
          name,
          description,
          position,
        }),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.activitiesRoot }),
  });
}

export function useDeleteActivity() {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => authedDelete(urls.activity(id), await getAccessToken()),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.activitiesRoot }),
  });
}

// Replaces an activity's whole schedule in one call rather than diffing rows.
// The form edits all of an activity's windows together, and a day that drops
// out is expressed by its window simply not being in the list.
export function useReplaceActivityHours() {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    // Answers with the saved windows, not the parent activity — the list is
    // refetched by the invalidation below rather than patched from this.
    mutationFn: async ({ id, hours }: { id: string; hours: ActivityHoursInput[] }) =>
      expectBody(
        await authedPut<ActivityHours[]>(urls.activityHours(id), await getAccessToken(), { hours }),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.activitiesRoot }),
  });
}
