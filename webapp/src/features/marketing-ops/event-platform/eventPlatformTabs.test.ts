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
import {
  EVENT_PLATFORM_ITEM_IDS,
  EVENT_TABS,
  TOP_LEVEL_TABS,
  eventPath,
  eventPlatformPath,
  eventTab,
  firstAllowedPath,
  parseEventPlatformPath,
  topLevelTab,
  visibleKinds,
  visibleTabs,
} from "./eventPlatformTabs";
import { MARKETING_OPS_APPS } from "@constants/marketingOpsApps";

/** A gate that allows exactly the ids given. */
const allowing = (...ids: string[]) => (id: string) => ids.includes(id);

// What useMarketingOpsGate answers for each role: an `eventplatform` holder
// (or a marketing-ops admin) passes both gate ids, an `eventplatform-shop`
// holder only the shop one.
const ADMIN = allowing("mops-event-platform-admin", "mops-event-platform-shop");
const SHOP_ONLY = allowing("mops-event-platform-shop");
const NOBODY = allowing();

describe("the shape of the Event Platform", () => {
  it("is a rail group with one item per top-level tab", () => {
    const app = MARKETING_OPS_APPS.find((a) => a.key === "event-platform");
    expect(app?.alwaysGroup).toBe(true);
    expect(app?.items.map((i) => [i.id, i.path])).toEqual([
      [EVENT_PLATFORM_ITEM_IDS.events, eventPlatformPath(topLevelTab("events")!)],
      [EVENT_PLATFORM_ITEM_IDS.speakers, eventPlatformPath(topLevelTab("speakers")!)],
    ]);
  });

  // The existing Events operation (attendee workbooks) owns `mops-events-*`.
  it("never claims an id from the Events operation", () => {
    const ids = MARKETING_OPS_APPS.find((app) => app.key === "event-platform")!.items.map((i) => i.id);
    for (const id of ids) expect(id.startsWith("mops-events-")).toBe(false);
  });

  it("keeps segments unique within each tab set", () => {
    for (const tabs of [TOP_LEVEL_TABS, EVENT_TABS]) {
      const segments = tabs.map((t) => t.segment);
      expect(new Set(segments).size).toBe(segments.length);
    }
  });

  it("gives every kind of every tab a gate and a subtitle", () => {
    for (const tab of [...TOP_LEVEL_TABS, ...EVENT_TABS]) {
      expect(tab.kinds.length, `${tab.segment} has no kinds`).toBeGreaterThan(0);
      for (const kind of tab.kinds) {
        expect(kind.gateId, `${tab.segment}/${kind.kind}`).toBeTruthy();
        expect(kind.subtitle.length, `${tab.segment}/${kind.kind}`).toBeGreaterThan(0);
      }
    }
  });

  // The source let a shop user into the two shop screens and nothing else.
  it("opens the shop, and only the shop, to the shop gate", () => {
    for (const tab of [...TOP_LEVEL_TABS, ...EVENT_TABS]) {
      for (const kind of tab.kinds) {
        const shop = kind.gateId === "mops-event-platform-shop";
        expect(shop, `${tab.segment}/${kind.kind}`).toBe(tab.segment === "shop");
      }
    }
  });
});

describe("paths", () => {
  it("builds top-level paths without a kind segment", () => {
    expect(eventPlatformPath(topLevelTab("events")!)).toBe("/marketing-ops/event-platform/events");
    expect(eventPlatformPath(topLevelTab("speakers")!)).toBe("/marketing-ops/event-platform/speakers");
  });

  it("names the kind for an in-event tab that offers several", () => {
    expect(eventPath("42", eventTab("sessions")!, "agenda")).toBe(
      "/marketing-ops/event-platform/events/42/sessions/agenda",
    );
    expect(eventPath("42", eventTab("shop")!, "orders")).toBe(
      "/marketing-ops/event-platform/events/42/shop/orders",
    );
  });

  it("leaves the kind out of an in-event tab that offers one", () => {
    expect(eventPath("42", eventTab("settings")!, "settings")).toBe(
      "/marketing-ops/event-platform/events/42/settings",
    );
  });

  // Event ids come from the backend; one with a slash in it must not be able
  // to reach a different route.
  it("encodes the event id", () => {
    const path = eventPath("a/b", eventTab("settings")!);
    expect(path).toBe("/marketing-ops/event-platform/events/a%2Fb/settings");
    expect(parseEventPlatformPath(path).eventId).toBe("a/b");
  });

  it("round-trips top-level tabs through parseEventPlatformPath", () => {
    for (const tab of TOP_LEVEL_TABS) {
      for (const kind of tab.kinds) {
        const parsed = parseEventPlatformPath(eventPlatformPath(tab, kind.kind));
        expect(parsed.eventId).toBeUndefined();
        expect(parsed.tab?.segment).toBe(tab.segment);
        expect(parsed.kind?.kind).toBe(kind.kind);
      }
    }
  });

  it("round-trips in-event tabs through parseEventPlatformPath", () => {
    for (const tab of EVENT_TABS) {
      for (const kind of tab.kinds) {
        const parsed = parseEventPlatformPath(eventPath("evt-7", tab, kind.kind));
        expect(parsed.eventId).toBe("evt-7");
        expect(parsed.tab?.segment).toBe(tab.segment);
        expect(parsed.kind?.kind).toBe(kind.kind);
      }
    }
  });

  // `/events` is the top-level list; `/events/<id>` is inside an event.
  it("tells the events list apart from an event", () => {
    expect(parseEventPlatformPath("/marketing-ops/event-platform/events").tab?.segment).toBe("events");
    const inside = parseEventPlatformPath("/marketing-ops/event-platform/events/42");
    expect(inside).toEqual({ eventId: "42" });
  });

  it("leaves the kind undefined for a multi-kind tab reached without one", () => {
    const parsed = parseEventPlatformPath("/marketing-ops/event-platform/events/42/sessions");
    expect(parsed.tab?.segment).toBe("sessions");
    expect(parsed.kind).toBeUndefined();
  });

  it("returns nothing for a segment it does not know", () => {
    expect(parseEventPlatformPath("/marketing-ops/event-platform/nonsense")).toEqual({});
    expect(parseEventPlatformPath("/marketing-ops/event-platformx/events")).toEqual({});
    expect(parseEventPlatformPath("/somewhere/else")).toEqual({});
    expect(parseEventPlatformPath("/marketing-ops/event-platform/events/42/nonsense")).toEqual({
      eventId: "42",
    });
  });
});

describe("what each role is offered", () => {
  it("gives an admin every tab", () => {
    expect(visibleTabs(TOP_LEVEL_TABS, ADMIN).map((t) => t.segment)).toEqual(["events", "speakers"]);
    expect(visibleTabs(EVENT_TABS, ADMIN).map((t) => t.segment)).toEqual([
      "sessions",
      "shop",
      "settings",
    ]);
    expect(visibleKinds(eventTab("sessions")!, ADMIN).map((k) => k.kind)).toEqual([
      "agenda",
      "speakers",
      "rooms",
      "activities",
      "export",
    ]);
  });

  it("gives a shop-only user the Shop tab and nothing else", () => {
    expect(visibleTabs(TOP_LEVEL_TABS, SHOP_ONLY)).toEqual([]);
    expect(visibleTabs(EVENT_TABS, SHOP_ONLY).map((t) => t.segment)).toEqual(["shop"]);
    expect(visibleKinds(eventTab("shop")!, SHOP_ONLY).map((k) => k.kind)).toEqual([
      "inventory",
      "orders",
    ]);
  });

  it("gives someone with neither role nothing", () => {
    expect(visibleTabs(TOP_LEVEL_TABS, NOBODY)).toEqual([]);
    expect(visibleTabs(EVENT_TABS, NOBODY)).toEqual([]);
  });
});

describe("where each role lands", () => {
  it("sends an admin to the events list, and into an event at its agenda", () => {
    expect(firstAllowedPath(ADMIN)).toBe("/marketing-ops/event-platform/events");
    expect(firstAllowedPath(ADMIN, "42")).toBe(
      "/marketing-ops/event-platform/events/42/sessions/agenda",
    );
  });

  it("sends a shop-only user into an event at its inventory", () => {
    expect(firstAllowedPath(SHOP_ONLY, "42")).toBe(
      "/marketing-ops/event-platform/events/42/shop/inventory",
    );
  });

  // The source gave a shop user no events list, so there is no top-level
  // screen to send them to — the home page explains instead.
  it("sends a shop-only user nowhere at the top level", () => {
    expect(firstAllowedPath(SHOP_ONLY)).toBeUndefined();
  });

  it("sends someone who may see nothing nowhere at all", () => {
    expect(firstAllowedPath(NOBODY)).toBeUndefined();
    expect(firstAllowedPath(NOBODY, "42")).toBeUndefined();
  });

  it("never lands on a kind the visitor cannot open", () => {
    for (const canSee of [ADMIN, SHOP_ONLY]) {
      for (const eventId of [undefined, "42"]) {
        const path = firstAllowedPath(canSee, eventId);
        if (!path) continue;
        const landed = parseEventPlatformPath(path);
        expect(landed.kind).toBeDefined();
        expect(canSee(landed.kind!.gateId)).toBe(true);
      }
    }
  });
});
