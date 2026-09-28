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

// The colour vocabulary a track or a room is assigned — names only. The backend
// enforces exactly these with a CHECK constraint (agenda-organizer migration
// 030_orange_color_token.sql), and every downstream app (the attendee microapp,
// the public agenda stylesheet) owns its own colour for each name, which is what
// lets them theme per appearance. So no hex ever travels over the API, and a
// ninth name needs the constraint changed first.
//
// The swatch hexes the source keeps next to these are UI, and land with the
// screens that draw them, re-checked against both colour schemes.

export const COLOR_TOKEN_NAMES = [
  "red",
  // Added for a venue's "Orange Room", which had been squatting on "red".
  // Ordered by hue, between the two names it sits between.
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "dark-blue",
  "main",
] as const;

export type ColorToken = (typeof COLOR_TOKEN_NAMES)[number];

// What an unset or unrecognised token resolves to, matching the backend's
// COALESCE(rooms.color_token, tracks.color_token, 'main').
export const DEFAULT_COLOR_TOKEN: ColorToken = "main";

export function isColorToken(value: unknown): value is ColorToken {
  return (COLOR_TOKEN_NAMES as readonly unknown[]).includes(value);
}

export function colorTokenOf(value: string | null | undefined): ColorToken {
  return isColorToken(value) ? value : DEFAULT_COLOR_TOKEN;
}
