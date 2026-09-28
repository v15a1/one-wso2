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
import type { Session } from "@features/marketing-ops/event-platform/types/eventPlatformTypes";
import {
  applyPlacement,
  removeById,
  replaceById,
  sessionMatchesFilters,
  UNPLACED,
  unplaceWhere,
} from "./cacheUpdates";

function session(over: Partial<Session> = {}): Session {
  return {
    id: "s1",
    configId: "e1",
    kind: "session",
    title: "Opening",
    description: "",
    durationSlots: 2,
    dayId: "d1",
    trackId: "t1",
    slotIndex: 3,
    sectionId: "sec1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    speakers: [],
    roomId: null,
    room: null,
    roomIsManual: false,
    topicId: null,
    topicIsManual: false,
    articleUrl: null,
    articleLabel: null,
    videoUrl: null,
    videoLabel: null,
    ...over,
  };
}

describe("sessionMatchesFilters", () => {
  it("keeps a session out of another event's lists", () => {
    expect(sessionMatchesFilters(session(), { configId: "e1" })).toBe(true);
    expect(sessionMatchesFilters(session(), { configId: "e2" })).toBe(false);
  });

  it("matches the day when one is asked for", () => {
    expect(sessionMatchesFilters(session(), { configId: "e1", dayId: "d1" })).toBe(true);
    expect(sessionMatchesFilters(session(), { configId: "e1", dayId: "d2" })).toBe(false);
  });

  it("treats scheduled as having a day, as the backend does", () => {
    const placed = session();
    const unplaced = session({ ...UNPLACED });
    expect(sessionMatchesFilters(placed, { configId: "e1", scheduled: true })).toBe(true);
    expect(sessionMatchesFilters(placed, { configId: "e1", scheduled: false })).toBe(false);
    expect(sessionMatchesFilters(unplaced, { configId: "e1", scheduled: false })).toBe(true);
    expect(sessionMatchesFilters(unplaced, { configId: "e1", scheduled: true })).toBe(false);
  });
});

describe("applyPlacement", () => {
  it("clears every placement field on unschedule, the section included", () => {
    const moved = applyPlacement(session(), UNPLACED);
    expect(moved).toMatchObject({ dayId: null, trackId: null, slotIndex: null, sectionId: null });
  });

  it("moves without touching the rest of the session", () => {
    const moved = applyPlacement(session(), { dayId: "d2", trackId: "t2", slotIndex: 0, sectionId: null });
    expect(moved).toMatchObject({ dayId: "d2", trackId: "t2", slotIndex: 0, sectionId: null, title: "Opening" });
  });
});

describe("unplaceWhere", () => {
  it("unplaces only the sessions picked", () => {
    const list = [session({ id: "a", trackId: "t1" }), session({ id: "b", trackId: "t2" })];
    const [a, b] = unplaceWhere(list, (s) => s.trackId === "t1");
    expect(a.dayId).toBeNull();
    expect(b).toBe(list[1]);
  });
});

describe("replaceById and removeById", () => {
  const list = [{ id: "a", n: 1 }, { id: "b", n: 2 }];

  it("replace the matching item and keep order", () => {
    expect(replaceById(list, { id: "b", n: 9 })).toEqual([{ id: "a", n: 1 }, { id: "b", n: 9 }]);
  });

  it("remove the matching item", () => {
    expect(removeById(list, "a")).toEqual([{ id: "b", n: 2 }]);
  });
});
