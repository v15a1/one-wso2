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

import { describe, expect, it } from "vitest";
import { eventPlatformKeys as keys, sessionFiltersOf } from "./queryKeys";

const startsWith = (key: readonly unknown[], prefix: readonly unknown[]) =>
  prefix.every((part, i) => key[i] === part);

describe("the Event Platform query keys", () => {
  // Not ["marketing-ops", "events", …]: that is the unrelated events feature,
  // in the same QueryClient.
  it("all sit under the marketing-ops event-platform root", () => {
    const every = [
      keys.events,
      keys.event("e1"),
      keys.days,
      keys.tracks("d1"),
      keys.allTracks,
      keys.trackSections("t1"),
      keys.keynoteSections("d1"),
      keys.footnotes("d1"),
      keys.trackTopics("e1"),
      keys.sessions({ configId: "e1" }),
      keys.speakers,
      keys.rooms("e1"),
      keys.roomMappings("e1"),
      keys.activities("e1"),
      keys.shopItems("e1"),
      keys.shopOrders("e1"),
      keys.exportAgenda("e1"),
      keys.exportSpeakers("e1"),
    ];
    for (const key of every) expect(key.slice(0, 2)).toEqual(["marketing-ops", "event-platform"]);
  });

  // The invalidations lean on these prefixes.
  it("put a day's tracks and every track under one prefix", () => {
    expect(startsWith(keys.tracks("d1"), keys.tracksRoot)).toBe(true);
    expect(startsWith(keys.allTracks, keys.tracksRoot)).toBe(true);
  });

  it("put every filtered session list under one prefix", () => {
    expect(startsWith(keys.sessions({ configId: "e1", dayId: "d1" }), keys.sessionsRoot)).toBe(true);
  });

  it("keep one event's cache out of the events list's prefix", () => {
    expect(startsWith(keys.event("e1"), keys.events)).toBe(false);
  });

  it("scope the per-root lists under their roots", () => {
    expect(startsWith(keys.rooms("e1"), keys.roomsRoot)).toBe(true);
    expect(startsWith(keys.trackTopics("e1"), keys.trackTopicsRoot)).toBe(true);
    expect(startsWith(keys.activities("e1"), keys.activitiesRoot)).toBe(true);
    expect(startsWith(keys.trackSections("t1"), keys.trackSectionsRoot)).toBe(true);
  });

  it("read a session list's filters back off its key", () => {
    const filters = { configId: "e1", scheduled: false };
    expect(sessionFiltersOf(keys.sessions(filters))).toEqual(filters);
    expect(sessionFiltersOf(keys.sessionsRoot)).toBeUndefined();
  });
});
