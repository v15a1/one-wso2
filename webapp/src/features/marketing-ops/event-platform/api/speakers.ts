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

// The speaker library — global, shared by every event. A session embeds its
// speakers, so a speaker edit also refreshes the cached session lists.

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
import { removeById, replaceById } from "@features/marketing-ops/event-platform/api/cacheUpdates";
import type {
  Session,
  Speaker,
  SpeakerType,
} from "@features/marketing-ops/event-platform/types/eventPlatformTypes";

// The create body, and (PUT) the whole replacement on update. `visible` is not
// here — it has a PATCH of its own.
export interface SpeakerInput {
  name: string;
  title: string;
  bio: string;
  speakerType: SpeakerType;
  company: string | null;
  linkedinUrl: string | null;
  photoUrl?: string | null;
  companyLogoUrl?: string | null;
  companyLogoSize?: string | null;
  modalCompanyLogoSize?: string | null;
}

export function useListSpeakers() {
  const { getAccessToken, ready } = useEventPlatformBase();
  return useQuery<Speaker[]>({
    queryKey: keys.speakers,
    enabled: ready,
    queryFn: async () => authedGet<Speaker[]>(urls.speakers, await getAccessToken()),
    retry: httpRetry,
  });
}

export function useCreateSpeaker() {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SpeakerInput) =>
      expectBody(await authedPost<Speaker>(urls.speakers, await getAccessToken(), input)),
    onSuccess: (created) => {
      qc.setQueryData<Speaker[]>(keys.speakers, (old = []) => [...old, created]);
    },
  });
}

export function useUpdateSpeaker() {
  const { getAccessToken } = useEventPlatformBase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: SpeakerInput & { id: string }) =>
      expectBody(await authedPut<Speaker>(urls.speaker(id), await getAccessToken(), input)),
    onSuccess: (updated) => {
      qc.setQueryData<Speaker[]>(keys.speakers, (old = []) => replaceById(old, updated));
      qc.invalidateQueries({ queryKey: keys.sessionsRoot });
    },
  });
}

export function useDeleteSpeaker() {
  const { getAccessToken } = useEventPlatformBase();
  const notifyFailure = useNotifyFailure();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => authedDelete(urls.speaker(id), await getAccessToken()),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: keys.speakers });
      const previous = qc.getQueryData<Speaker[]>(keys.speakers);
      qc.setQueryData<Speaker[]>(keys.speakers, (old = []) => removeById(old, id));
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      qc.setQueryData(keys.speakers, ctx?.previous);
      notifyFailure("Couldn't delete the speaker — changes reverted.", err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.speakers }),
  });
}

// Optimistic in both the library and every session that embeds the speaker,
// since the agenda greys out hidden speakers on their cards.
export function useToggleSpeakerVisibility() {
  const { getAccessToken } = useEventPlatformBase();
  const notifyFailure = useNotifyFailure();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) =>
      expectBody(await authedPatch<Speaker>(urls.speaker(id), await getAccessToken(), { visible })),
    onMutate: async ({ id, visible }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: keys.speakers }),
        qc.cancelQueries({ queryKey: keys.sessionsRoot }),
      ]);
      const prevSpeakers = qc.getQueryData<Speaker[]>(keys.speakers);
      const sessionSnapshots = qc.getQueriesData<Session[]>({ queryKey: keys.sessionsRoot });
      qc.setQueryData<Speaker[]>(keys.speakers, (old = []) =>
        old.map((s) => (s.id === id ? { ...s, visible } : s)),
      );
      qc.setQueriesData<Session[]>({ queryKey: keys.sessionsRoot }, (old) =>
        old?.map((s) => ({
          ...s,
          speakers: s.speakers.map((ss) =>
            ss.speaker.id === id ? { ...ss, speaker: { ...ss.speaker, visible } } : ss,
          ),
        })),
      );
      return { prevSpeakers, sessionSnapshots };
    },
    onError: (err, _vars, ctx) => {
      if (ctx) {
        qc.setQueryData(keys.speakers, ctx.prevSpeakers);
        ctx.sessionSnapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      }
      notifyFailure("Couldn't change the speaker's visibility — changes reverted.", err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.speakers });
      qc.invalidateQueries({ queryKey: keys.sessionsRoot });
    },
  });
}
