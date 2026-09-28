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
import type { ShopItem } from "@features/marketing-ops/event-platform/types/eventPlatformTypes";
import { toShopItemBody, toTrackSectionBody, toTrackSectionPatch } from "./payloads";

describe("toTrackSectionBody", () => {
  it("fills unset rooms and topics with null", () => {
    expect(toTrackSectionBody({ label: "AI", startSlot: 2, durationSlots: 4 })).toEqual({
      label: "AI",
      startSlot: 2,
      durationSlots: 4,
      roomId: null,
      topicId: null,
    });
  });
});

describe("toTrackSectionPatch", () => {
  it("keeps the id and parent ids out of the body", () => {
    const body = toTrackSectionPatch({ id: "s1", trackId: "t1", dayId: "d1", label: "Renamed" });
    expect(JSON.parse(JSON.stringify(body))).toEqual({ label: "Renamed" });
  });

  it("sends an explicit null, which clears the room", () => {
    const body = toTrackSectionPatch({ id: "s1", roomId: null });
    expect(JSON.parse(JSON.stringify(body))).toEqual({ roomId: null });
  });
});

describe("toShopItemBody", () => {
  it("drops the id an item read from the list carries", () => {
    const item: ShopItem & { visibility: "VISIBLE" } = {
      id: "i1",
      name: "Mug",
      description: null,
      price: 10,
      imageUrl: "https://cdn.example.com/mug.png",
      availableStock: 5,
      category: "merch",
      maxPerUser: 2,
      visibility: "VISIBLE",
    };
    const body = toShopItemBody(item);
    expect(body).not.toHaveProperty("id");
    expect(Object.keys(body).sort()).toEqual([
      "availableStock",
      "category",
      "description",
      "imageUrl",
      "maxPerUser",
      "name",
      "price",
      "visibility",
    ]);
  });
});
