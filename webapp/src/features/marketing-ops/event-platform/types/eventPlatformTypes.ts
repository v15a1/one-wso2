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

// Wire types for the agenda-organizer backend, ported from the source
// frontend's types/api.ts and checked against the Go models
// (backend/internal/models). Timestamps arrive as ISO strings.

import type { ColorToken } from "@features/marketing-ops/event-platform/types/colorTokens";

export interface ConferenceDay {
  id: string;
  configId: string;
  dayIndex: number;
  date: string;
  startMinute: number;
  endMinute: number;
  label: string | null;
  startTimeOffset: string;
  endTimeOffset: string;
}

export interface ConferenceConfig {
  id: string;
  name: string;
  startDate: string;
  createdAt: string;
  updatedAt: string;
  articleLinksEnabled: boolean;
  videoLinksEnabled: boolean;
  artifactLabels?: string[];
  defaultInternalLogoUrl?: string | null;
  timezone: string;
  venueName?: string | null;
  venueAddress?: string | null;
  shopClosingTime?: string | null;
  keynoteRoomId?: string | null;
  days: ConferenceDay[];
}

// Event-scoped subjects that drive the public agenda's track filter.
export interface TrackTopic {
  id: string;
  configId: string;
  name: string;
  slug: string;
  position: number;
  showInFilter: boolean;
  createdAt: string;
  updatedAt: string;
}

// Track and section room mappings live on those entities; only the keynote
// room needs its own home, because keynotes belong to a day, not a track.
export interface RoomMappings {
  configId: string;
  keynoteRoomId: string | null;
}

export interface SessionArtifact {
  label: string;
  url: string;
}

export interface Room {
  id: string;
  configId: string;
  name: string;
  // Wins over the track's token wherever both are set. Null means "not chosen
  // here", which is what lets the room → track → 'main' chain fall through.
  colorToken: ColorToken | null;
}

export interface TrackSection {
  id: string;
  trackId: string | null;
  dayId: string | null;
  kind: "track" | "keynote";
  label: string;
  startSlot: number;
  durationSlots: number;
  position: number;
  // Overrides the parent track's room for sessions in this section; null
  // inherits the track's room.
  roomId: string | null;
  room: Room | null;
  topicId: string | null;
}

export interface TimeslotFootnote {
  id: string;
  dayId: string;
  slotIndex: number;
  text: string;
  position: number;
}

export interface Track {
  id: string;
  dayId: string;
  // Fallback for tracks with no room. The mapped room's token wins.
  colorToken: ColorToken | null;
  position: number;
  roomId: string | null;
  room: Room | null;
}

export type SpeakerBaseType = "internal" | "external";
export type SpeakerType = SpeakerBaseType | "keynote" | "moderator";

export type SessionSpeakerRole = "keynote" | "internal" | "external" | "moderator" | "leader";

export interface Speaker {
  id: string;
  name: string;
  title: string;
  bio: string;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  speakerType: SpeakerType;
  company: string | null;
  companyLogoUrl: string | null;
  companyLogoSize: string | null;
  modalCompanyLogoSize: string | null;
  linkedinUrl: string | null;
  visible: boolean;
}

export interface SessionSpeaker {
  speaker: Speaker;
  role: SessionSpeakerRole;
}

export type SessionKind = "session" | "keynote" | "break" | "activity";

export interface Session {
  id: string;
  configId: string;
  kind: SessionKind;
  title: string;
  description: string;
  durationSlots: number;
  dayId: string | null;
  trackId: string | null;
  slotIndex: number | null;
  sectionId: string | null;
  createdAt: string;
  updatedAt: string;
  speakers: SessionSpeaker[];
  roomId: string | null;
  room: Room | null;
  // True when the room was picked explicitly on this session. Room mapping
  // reconciliation skips these, so a deliberate override survives a mapping
  // edit that would otherwise reassign it. Read-only: the create and update
  // bodies have no such field, the server derives it from `roomId`.
  roomIsManual: boolean;
  topicId: string | null;
  // Same as roomIsManual, for the topic — but this one IS writable.
  topicIsManual: boolean;
  articleUrl: string | null;
  articleLabel: string | null;
  videoUrl: string | null;
  videoLabel: string | null;
  artifacts?: SessionArtifact[];
}

// Which sessions a list asks for. `configId` is required, not optional as the
// endpoint allows: an unscoped list returns every event's sessions, which is how
// the source's agenda palette came to offer other events' unscheduled sessions.
export interface SessionFilters {
  configId: string;
  dayId?: string;
  // Placed on the grid (has a day) or not.
  scheduled?: boolean;
}

export type ShopItemVisibility = "VISIBLE" | "HIDDEN" | "DELETED";

export interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string;
  availableStock: number;
  category: string;
  maxPerUser: number | null;
  visibility: ShopItemVisibility;
}

export interface ShopOrderItem {
  itemId: string;
  name: string;
  quantity: number;
  priceAtPurchase: number;
}

export type ShopOrderStatus = "PENDING" | "CONFIRMED" | "FULFILLED" | "EXPIRED" | "FAILED";

// Carries the buyer's shipping address and email — PII. Never log one or put
// its fields in an error message.
export interface ShopOrder {
  id: string;
  userUuid: string;
  status: ShopOrderStatus;
  transactionHash: string | null;
  totalCoinsAmount: number;
  createdOn: string;
  createdBy: string;
  updatedOn: string;
  updatedBy: string;
  shippingRecipientName: string;
  shippingEmail: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string | null;
  shippingCity: string;
  shippingState: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string;
  items: ShopOrderItem[];
}

// Venue activities: things open at the venue while the agenda runs, like a bar
// or a booth. Deliberately not sessions — they never reach the agenda export,
// only the attendee app, which is the distinction sessions.kind='activity'
// could not express.
export interface ActivityHours {
  id: string;
  activityId: string;
  dayId: string;
  // Wall-clock minutes from midnight, the same unit ConferenceDay.startMinute
  // uses. Not the session slot grid — activities are not placed against tracks.
  startMinute: number;
  endMinute: number;
}

export interface Activity {
  id: string;
  configId: string;
  name: string;
  description: string;
  position: number;
  // One window per day the activity runs. A day it is not running simply has
  // no entry, which is why this is a list rather than a field per day.
  hours: ActivityHours[];
  createdAt: string;
  updatedAt: string;
}
