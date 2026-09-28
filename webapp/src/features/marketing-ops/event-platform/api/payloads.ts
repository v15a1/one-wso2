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

// Request bodies the handlers bind strictly (DisallowUnknownFields): each mapper
// picks exactly the keys one handler declares, so an extra field on a form value
// or an entity read back from a list can't turn a save into a 400.

import type { ShopItemVisibility } from "@features/marketing-ops/event-platform/types/eventPlatformTypes";

// What the two create routes take. `roomId` overrides the track's room for
// sessions in the section; null inherits it.
export interface TrackSectionInput {
  label: string;
  startSlot: number;
  durationSlots: number;
  roomId?: string | null;
  topicId?: string | null;
}

// The create body: nulls filled in, the parent id kept out (it is in the path).
export function toTrackSectionBody(input: TrackSectionInput) {
  return {
    label: input.label,
    startSlot: input.startSlot,
    durationSlots: input.durationSlots,
    roomId: input.roomId ?? null,
    topicId: input.topicId ?? null,
  };
}

// Which cache a section lives in: its track's, or (keynotes) its day's.
export interface SectionParent {
  trackId?: string | null;
  dayId?: string | null;
}

export interface UpdateTrackSectionInput extends SectionParent {
  id: string;
  label?: string;
  startSlot?: number;
  durationSlots?: number;
  // Tri-state on the server: left out = untouched, null = cleared.
  roomId?: string | null;
  topicId?: string | null;
}

// The PATCH body. The id and parent ids are the address, not fields, so they
// stay out; undefined fields drop out of the JSON, which is what makes the
// PATCH partial.
export function toTrackSectionPatch(input: UpdateTrackSectionInput) {
  return {
    label: input.label,
    startSlot: input.startSlot,
    durationSlots: input.durationSlots,
    roomId: input.roomId,
    topicId: input.topicId,
  };
}

// What a create or update sends. DELETED is a state the server reaches, not one
// a form may set — the handler accepts only VISIBLE or HIDDEN.
export interface ShopItemInput {
  name: string;
  description: string | null;
  price: number;
  imageUrl: string;
  availableStock: number;
  category: string;
  maxPerUser: number | null;
  visibility: Exclude<ShopItemVisibility, "DELETED">;
}

// Picks exactly the body fields off a form value or a whole ShopItem — the
// handler rejects unknown keys, and an item read from the list carries `id`.
export function toShopItemBody(item: ShopItemInput): ShopItemInput {
  return {
    name: item.name,
    description: item.description,
    price: item.price,
    imageUrl: item.imageUrl,
    availableStock: item.availableStock,
    category: item.category,
    maxPerUser: item.maxPerUser,
    visibility: item.visibility,
  };
}
