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

// Wire types + the authorization predicate for the Marketing Ops backend.
//
// Marketing Ops does NOT use the people-app privilege numbers the rest of One
// WSO2 gates on (see @constants/appMenu). It has its own group-driven scheme:
// the backend derives a set of capability tokens from the caller's Asgardeo
// groups and returns them on /api/me. Everything in this file exists to keep
// that vocabulary in one place instead of letting group names leak into
// components.

// A Marketing Ops capability token, as the gate refers to it.
//
// The token is the Asgardeo group name with the app prefix and the environment
// suffix stripped, so a group named `<prefix>-events-review-<env>` arrives here
// as just `events-review`. Derived by `_capability_from_group` in the backend's
// shared/rbac.py, where the prefix and env suffix are both env-var configured;
// the authoritative capability list is shared/access_map.yaml.
//
// Deliberately a CLOSED union, while the wire field below is a plain
// `string[]`. That asymmetry is the point:
//
//   - Anything we *look up* must be a capability that really exists, so a typo
//     in useMarketingOpsGate's ITEM_CAPABILITY map is a compile error rather
//     than a silently-never-matching gate that hides a screen from everyone (or
//     worse, one that a later refactor "fixes" by opening it up).
//   - Anything the backend *sends* must deserialise even if it's a token this
//     frontend has never heard of — a newer backend adding a capability should
//     not break the response type. Unknown tokens simply match nothing.
export type MarketingOpsCapability =
  | "crmupload"
  | "emailworkbench"
  | "adcampaigns"
  | "events"
  | "events-review"
  | "designstudio"
  // Event Platform (the agenda-organizer port). Two SIBLING capabilities, the
  // same shape as `events` / `events-review`: `eventplatform` is the source's
  // admin role, `eventplatform-shop` its shop-only role. Holding the shop one
  // grants nothing outside the shop.
  | "eventplatform"
  | "eventplatform-shop";

// GET /api/me. Authenticated but deliberately NOT gated — an authenticated
// caller who holds none of the Marketing Ops groups still gets a 200 with
// `authorized: false`, which is what lets the UI render an honest
// "you don't have access" state instead of surfacing a bare 403.
export interface MarketingOpsMe {
  sub: string;
  email: string;
  // Every Asgardeo group on the caller's gateway assertion — including the
  // many that have nothing to do with Marketing Ops (wso2-employees, WIFI_*,
  // other apps' groups). Diagnostic value only: never gate on this array.
  // Gate on `capabilities` + `isAdmin`, which the backend has already filtered
  // and environment-matched for us.
  groups: string[];
  // May the caller use Marketing Ops at all — i.e. do they hold the admin
  // group, the marketing baseline group, or any feature capability.
  authorized: boolean;
  // The admin master key. See hasMarketingOpsCapability below for why this
  // must never be read on its own.
  isAdmin: boolean;
  // Plain `string[]`, not MarketingOpsCapability[] — see the note on that type.
  // The known tokens are the ones the gate can act on; an unrecognised one from
  // a newer backend arrives intact and matches nothing.
  capabilities: string[];
  // Present only when the backend runs with RBAC_DEBUG_CLAIMS=true — it echoes
  // the caller's own validated assertion claims so the real claim keys can be
  // confirmed against a live gateway. Off in staging as of 2026-08-17, and
  // the backend carries a TODO to remove it, so treat it as a debugging aid
  // that may vanish.
  claims?: Record<string, unknown> | null;
}

// The ONE way to ask whether a caller holds a Marketing Ops capability.
//
// ⚠️ `isAdmin` is NOT included in `capabilities` — the backend's
// `capabilities_for()` explicitly skips the admin group when deriving the set,
// because admin is a separate master key rather than a superset of the feature
// capabilities. Verified 2026-08-17 against staging: a caller holding ONLY the
// admin group comes back as `{ isAdmin: true, capabilities: [] }`.
//
// So reading `capabilities` alone would lock every admin out of every feature.
// That mistake is easy to make and silent when you make it, which is why no
// component should test membership by hand — call this instead.
export function hasMarketingOpsCapability(
  me: MarketingOpsMe | undefined,
  capability: MarketingOpsCapability,
): boolean {
  if (!me) return false;
  return me.isAdmin || me.capabilities.includes(capability);
}
