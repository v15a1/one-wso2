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

import { afterEach, describe, expect, it, vi } from "vitest";

const originalConfig = window.config;

async function load(backendUrl?: string) {
  vi.resetModules();
  window.config = {
    ...(window.config ?? {}),
    ONE_WSO2_EVENT_PLATFORM_BACKEND_URL: backendUrl,
  } as Window["config"];
  return import("@config/apiConfig");
}

afterEach(() => {
  window.config = originalConfig;
});

const BASE = "https://api.example.com/event-platform";

describe("the Event Platform URL builders", () => {
  it("are unconfigured when the backend URL is absent", async () => {
    const config = await load();
    expect(config.eventPlatformBackendUrl).toBe("");
    expect(config.isEventPlatformConfigured()).toBe(false);
  });

  it("strip trailing slashes off the base", async () => {
    const { eventPlatformServiceUrls: urls, isEventPlatformConfigured } = await load(`${BASE}///`);
    expect(isEventPlatformConfigured()).toBe(true);
    expect(urls.events).toBe(`${BASE}/api/events`);
  });

  it("follow the backend's routes, singular /event/ collections included", async () => {
    const { eventPlatformServiceUrls: urls } = await load(BASE);
    expect(urls.event("e1")).toBe(`${BASE}/api/events/e1`);
    expect(urls.days).toBe(`${BASE}/api/event/days`);
    expect(urls.allTracks).toBe(`${BASE}/api/event/tracks`);
    expect(urls.dayTracks("d1")).toBe(`${BASE}/api/event/days/d1/tracks`);
    expect(urls.track("t1")).toBe(`${BASE}/api/tracks/t1`);
    expect(urls.trackSections("t1")).toBe(`${BASE}/api/tracks/t1/sections`);
    expect(urls.dayKeynoteSections("d1")).toBe(`${BASE}/api/event/days/d1/keynote-sections`);
    expect(urls.trackSection("s1")).toBe(`${BASE}/api/track-sections/s1`);
    expect(urls.dayFootnotes("d1")).toBe(`${BASE}/api/event/days/d1/footnotes`);
    expect(urls.footnote("f1")).toBe(`${BASE}/api/footnotes/f1`);
    expect(urls.eventTrackTopics("e1")).toBe(`${BASE}/api/events/e1/track-topics`);
    expect(urls.trackTopic("tp1")).toBe(`${BASE}/api/track-topics/tp1`);
    expect(urls.session("x1")).toBe(`${BASE}/api/sessions/x1`);
    expect(urls.sessionPlacement("x1")).toBe(`${BASE}/api/sessions/x1/placement`);
    expect(urls.sessionArtifacts("x1")).toBe(`${BASE}/api/sessions/x1/artifacts`);
    expect(urls.speakers).toBe(`${BASE}/api/speakers`);
    expect(urls.speaker("sp1")).toBe(`${BASE}/api/speakers/sp1`);
    expect(urls.rooms).toBe(`${BASE}/api/event/rooms`);
    expect(urls.room("r1")).toBe(`${BASE}/api/rooms/r1`);
    expect(urls.roomMappings).toBe(`${BASE}/api/event/room-mappings`);
    expect(urls.roomsReapply).toBe(`${BASE}/api/event/rooms/reapply`);
    expect(urls.eventActivities("e1")).toBe(`${BASE}/api/events/e1/activities`);
    expect(urls.activity("a1")).toBe(`${BASE}/api/activities/a1`);
    expect(urls.activityHours("a1")).toBe(`${BASE}/api/activities/a1/hours`);
    expect(urls.shopItems("e1")).toBe(`${BASE}/api/events/e1/shop/items`);
    expect(urls.shopItem("e1", "i1")).toBe(`${BASE}/api/events/e1/shop/items/i1`);
    expect(urls.shopOrders("e1")).toBe(`${BASE}/api/events/e1/shop/orders`);
    expect(urls.shopOrderStatus("e1", "o1")).toBe(`${BASE}/api/events/e1/shop/orders/o1/status`);
    expect(urls.exportAgenda("e1")).toBe(`${BASE}/api/events/e1/export/agenda`);
  });

  it("encode path params", async () => {
    const { eventPlatformServiceUrls: urls } = await load(BASE);
    expect(urls.event("a/b c")).toBe(`${BASE}/api/events/a%2Fb%20c`);
    expect(urls.shopItem("e/1", "i?2")).toBe(`${BASE}/api/events/e%2F1/shop/items/i%3F2`);
  });

  it("scope rooms and room mappings by event in the query, not the path", async () => {
    const { eventPlatformServiceUrls: urls } = await load(BASE);
    expect(urls.roomsForEvent("e 1")).toBe(`${BASE}/api/event/rooms?configId=e+1`);
    expect(urls.roomMappingsForEvent("e1")).toBe(`${BASE}/api/event/room-mappings?configId=e1`);
  });

  it("build the sessions query from the filters that are set", async () => {
    const { eventPlatformServiceUrls: urls } = await load(BASE);
    expect(urls.sessions()).toBe(`${BASE}/api/sessions`);
    expect(urls.sessions({ configId: "e1" })).toBe(`${BASE}/api/sessions?configId=e1`);
    expect(urls.sessions({ configId: "e1", dayId: "d1", scheduled: true })).toBe(
      `${BASE}/api/sessions?configId=e1&dayId=d1&scheduled=true`,
    );
    // false is a filter, not an absence.
    expect(urls.sessions({ configId: "e1", scheduled: false })).toBe(
      `${BASE}/api/sessions?configId=e1&scheduled=false`,
    );
  });

  it("leave the speakers export's roles to the server default when none are given", async () => {
    const { eventPlatformServiceUrls: urls } = await load(BASE);
    expect(urls.exportSpeakers("e1")).toBe(`${BASE}/api/events/e1/export/speakers`);
    expect(urls.exportSpeakers("e1", "")).toBe(`${BASE}/api/events/e1/export/speakers`);
    expect(urls.exportSpeakers("e1", "keynote,internal")).toBe(
      `${BASE}/api/events/e1/export/speakers?roles=keynote%2Cinternal`,
    );
  });
});
