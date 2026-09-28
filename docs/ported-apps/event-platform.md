# Event Platform — functional specification

**Status:** written *ahead of* the port (phase 0). Nothing is built yet. This is the reference the
later phases are checked against, and the record of what is deliberately left out or changed.

**Source of truth for behaviour:** `digiops-marketing/apps/conference/agenda-organizer` —
`frontend/src` for the UI (`router.tsx`, `api/*.ts`, `types/api.ts`, `components/side-nav-bar/`,
`components/header/Header.tsx`), and `backend/cmd/server/main.go` plus `backend/openapi.yaml` for the
wire contract. Where the two backend files disagree, `main.go` wins: it is what actually routes.

**In One WSO2:** one entry under Marketing Ops → **Event Platform**, at
`/marketing-ops/event-platform`. The source's two sidebars become two levels of routed tabs, the same
tab-plus-toggle pattern Leave uses (`docs/ported-apps/leave-app.md`). Backend is the agenda-organizer
Go service, unchanged in shape, configured as `ONE_WSO2_EVENT_PLATFORM_BACKEND_URL`.

---

## 1. Purpose and users

Marketing builds conference agendas: events with days, tracks, sections and sessions placed on a
slot grid; a speaker library shared across events; rooms and venue activities; a static HTML/JSON
export for the conference site. A separate shop ("O2C") sells event merchandise for coins; its
operators manage inventory and fulfil orders.

Two capabilities, both from the Marketing Ops access map (§4):

| Capability | Replaces source role | Gets |
|---|---|---|
| `eventplatform` | admin | everything |
| `eventplatform-shop` | shop | the Shop tab of any event, and the event list (§8, Q1) |

They are **siblings, not a hierarchy**: holding one does not imply the other. The Marketing Ops
admin master key (`isAdmin`) grants both, as it does every Marketing Ops feature.

The source backend also knows a third, read-only `user` role (`RBAC_USER_ROLES`). The source UI
never admits it — `RoleGuard` lets only admin or shop through — so it has no screen to port and is
dropped (§7).

---

## 2. Route map

All paths below are relative to `/marketing-ops/event-platform`. Config file:
`features/marketing-ops/event-platform/eventPlatformTabs.ts`, same shape and helpers as
`leaveTabs.ts` (`visibleTabs`, `visibleKinds`, `firstAllowedPath`, `parse…Path`, `…Path`), with two
tab sets and `:eventId` threaded into the path builders.

### 2.1 Top level

| Tab | Toggle | Target | Source route | Source page | Access |
|---|---|---|---|---|---|
| Events | — | `/events` | `/` | `EventsDashboard` | admin (shop: see §8, Q1) |
| Speakers | — | `/speakers` | `/speakers` | `SpeakersPage` | admin |

`/marketing-ops/event-platform` → `firstAllowedPath`.

### 2.2 Inside an event (`/events/:eventId`)

| Tab | Toggle kind | Target | Source route | Source page | Access |
|---|---|---|---|---|---|
| Sessions | Agenda | `/sessions/agenda` | `/events/:eventId` | `SessionEditorPage` | admin |
| | Speakers | `/sessions/speakers` | `/events/:eventId/speakers` | `EventSpeakersPage` | admin |
| | Rooms | `/sessions/rooms` | `/events/:eventId/rooms` | `RoomsPage` | admin |
| | Activities | `/sessions/activities` | `/events/:eventId/activities` | `ActivitiesPage` | admin |
| | Export | `/sessions/export` | `/events/:eventId/export` | `EventExportPage` | admin |
| Shop | Inventory | `/shop/inventory` | `/events/:eventId/shop-items` | `ShopInventoryPage` | admin or shop |
| | Orders | `/shop/orders` | `/events/:eventId/shop-orders` | `ShopOrdersPage` | admin or shop |
| Settings | — | `/settings` | `/events/:eventId/settings` | `EventSettingsPage` | admin |

Toggle labels are shortened from the source sidebar ("Session Editor", "Session Speakers", "Shop
Inventory", "Orders & Checkouts") because the tab already names the group. The source's "O2C" group
label becomes **Shop**, which is what its routes and backend already call it.

### 2.3 Routing rules

- `/events/:eventId` → that event's `firstAllowedPath`; a shop-only user lands on `shop/inventory`.
- A multi-kind tab with no kind (`/events/42/sessions`) → its first allowed kind.
- Every leaf is wrapped in `EventPlatformRoute gateId=…`, same contract as `LeaveKindRoute`: wait
  for `isResolving`, then render, redirect to an allowed leaf, or say "not available for your role".
  A hidden tab must be refused at its URL too; hiding is not access control.
- The toggle row is drawn only when the tab has two or more kinds the visitor may open.
- Inside an event the shell header carries the event switcher (from source `Header.tsx`) and a
  "← All events" link.
- Heavy leaves (Agenda, Export) are lazy with a `Skeleton` fallback.
- Code lives in `features/marketing-ops/event-platform/`, routes exported as an
  `eventPlatformRoutes` fragment spread into `App.tsx`. Menu ids use `mops-event-platform-*` so they
  cannot clash with the existing, unrelated `features/marketing-ops/events` (`mops-events-*`).

---

## 3. Screens (scope summary)

Behaviour is ported as-is unless §7 says otherwise. One line each, to fix scope per phase:

- **Events** — card list and create. Card opens the event. (Delete lives in Settings.)
- **Speakers** — global library shared by all events; create, edit, delete, visibility toggle, CSV
  import (row-by-row create/update).
- **Agenda** — day picker, tracks per day, track and keynote sections, footnotes, unscheduled
  palette, native HTML5 drag and drop onto the slot grid, session dialog (speakers, room, topic,
  artifacts, rich text), session CSV import, track-topic management.
- **Event speakers** — speakers derived from this event's sessions, with their roles.
- **Rooms** — room CRUD, `RoomMappingTree` (day → track → section room mapping, keynote room),
  "reapply rooms".
- **Activities** — venue activities with per-day open windows, saved as one whole-schedule PUT.
- **Export** — JSON previews and downloads for agenda and speakers, plus a static HTML agenda built
  client-side from `public/agenda-template.html` and `utils/staticAgenda/runtime.js?raw`.
- **Inventory** — shop item CRUD (`ItemFormDialog`), stock and sold counts from orders.
- **Orders** — order table, `ShopOrderDrawer`, status changes with an optional transaction hash.
- **Settings** — event fields (name, dates, timezone, venue, shop closing time, artifact labels,
  link toggles) and its days, saved as one `PUT /api/events/{id}`; delete event (confirm).

---

## 4. RBAC

one-wso2 has no backend; the UI mirrors what each backend enforces. Event Platform reuses the
Marketing Ops gate rather than adding its own `/api/me`:

- **Source of truth:** `digiops-marketing/agents/marketing-ops/backend/shared/access_map.yaml` gains
  an `eventplatform` feature — `general` → group `eventplatform`, `shop` → group
  `eventplatform-shop`. Groups resolve to `app-marketingops-eventplatform[-shop][-<env>]`. Holding
  either makes the caller `authorized` on Marketing Ops `/api/me` (`rbac.can_login`).
- **Frontend:** `useMarketingOpsGate` + `ITEM_CAPABILITY`. Add `"eventplatform" |
  "eventplatform-shop"` to `MarketingOpsCapability`. `hasMarketingOpsCapability` keeps `isAdmin` as
  the master key.
- **Gate ids** (in `ITEM_CAPABILITY`):

  | Id | Capability | Used by |
  |---|---|---|
  | `mops-event-platform` | `eventplatform` **or** `eventplatform-shop` | rail entry |
  | `mops-event-platform-admin` | `eventplatform` | Events\*, Speakers, Sessions/*, Settings |
  | `mops-event-platform-shop` | `eventplatform` **or** `eventplatform-shop` | Shop/* |

  \* Events is `admin` until §8 Q1 is settled.

  `ITEM_CAPABILITY` maps one id to one capability today. "Admin or shop" needs any-of, so phase 1
  widens the value to `MarketingOpsCapability | readonly MarketingOpsCapability[]` (any-of). The
  alternative — `canSee(a) || canSee(b)` at each call site — would let the rail, the tab bar and the
  route guard drift apart, which is the failure the single map exists to prevent.
- **Fail closed:** a registry item with `requires` and no `ITEM_CAPABILITY` line is hidden from
  everyone, admins included. Add the lines in the same PR as the registry entry.

---

## 5. API contract

Base: `ONE_WSO2_EVENT_PLATFORM_BACKEND_URL` (e.g. `https://api.example.com/event-platform`), trailing
slashes stripped as `marketingOpsBackendUrl` does. All calls use `authedGet/Post/Put/Patch/Delete`
(Bearer access token); the gateway turns it into `x-jwt-assertion` (§6). JSON bodies are bound with
`DisallowUnknownFields`, so an extra key is a 400 — send exactly the fields listed. 1 MiB body cap.

Access column: **R** = any app member (admin, shop or user role), **A** = admin, **S** = admin or
shop. Types are those in source `types/api.ts`.

### 5.1 Events, days, export

| Method | Path | Body → Response | Access |
|---|---|---|---|
| GET | `/api/events` | → `ConferenceConfig[]` | R |
| POST | `/api/events` | `{name, startDate, …}` → `ConferenceConfig` (201) | A |
| GET | `/api/events/{id}` | → `ConferenceConfig` (includes `days`) | R |
| PUT | `/api/events/{id}` | event fields **and the full `days` array** → `ConferenceConfig` (upsert; this is how days are edited) | A |
| DELETE | `/api/events/{id}` | → 204 | A |
| GET | `/api/event/days` | → `ConferenceDay[]` — **every event's days**; filter by `configId` client-side (`RoomMappingTree`) | R |
| GET | `/api/events/{id}/export/agenda` | → `AgendaExport`, `Content-Disposition` filename | R |
| GET | `/api/events/{id}/export/speakers?roles=` | `roles` comma list, default `internal,external` → `SpeakersExport` | R |

### 5.2 Tracks, sections, footnotes, topics

| Method | Path | Body → Response | Access |
|---|---|---|---|
| GET | `/api/event/tracks` | → `Track[]` — every event's; used by `RoomMappingTree` | R |
| GET | `/api/event/days/{dayId}/tracks` | → `Track[]` | R |
| POST | `/api/event/days/{dayId}/tracks` | `{colorToken, roomId}` → `Track` | A |
| PATCH | `/api/tracks/{id}` | `{colorToken, roomId}` → `Track` | A |
| DELETE | `/api/tracks/{id}` | → 204 (client first unplaces its sessions, §5.3) | A |
| GET | `/api/tracks/{id}/sections` | → `TrackSection[]` (one call per track) | R |
| POST | `/api/tracks/{id}/sections` | `{label, startSlot, durationSlots, roomId, topicId}` → `TrackSection` | A |
| GET | `/api/event/days/{dayId}/keynote-sections` | → `TrackSection[]` | R |
| POST | `/api/event/days/{dayId}/keynote-sections` | as above → `TrackSection` | A |
| PATCH | `/api/track-sections/{id}` | partial → `TrackSection` | A |
| DELETE | `/api/track-sections/{id}` | → 204 (client first unplaces its sessions) | A |
| GET | `/api/event/days/{dayId}/footnotes` | → `TimeslotFootnote[]` | R |
| POST | `/api/event/days/{dayId}/footnotes` | `{slotIndex, text}` → `TimeslotFootnote` | A |
| PATCH | `/api/footnotes/{id}` | partial → `TimeslotFootnote` | A |
| DELETE | `/api/footnotes/{id}` | → 204 | A |
| GET | `/api/events/{id}/track-topics` | → `TrackTopic[]` | R |
| POST | `/api/events/{id}/track-topics` | `{name, slug, showInFilter}` → `TrackTopic`; 409 on duplicate slug | A |
| **PUT** | `/api/track-topics/{id}` | `UpdateTrackTopicInput` → `TrackTopic`; 409 on duplicate slug | A |
| DELETE | `/api/track-topics/{id}` | → 204; references nulled server-side | A |

### 5.3 Sessions and speakers

| Method | Path | Body → Response | Access |
|---|---|---|---|
| GET | `/api/sessions?configId=&dayId=&scheduled=` | → `Session[]`; `scheduled=false` requires `configId` | R |
| POST | `/api/sessions` | session fields + `speakers[{speakerId, role}]` → `Session` | A |
| PATCH | `/api/sessions/{id}` | partial → `Session` | A |
| PUT | `/api/sessions/{id}/placement` | `{dayId, trackId, slotIndex, sectionId}` (all null = unschedule) → `Session` | A |
| PATCH | `/api/sessions/{id}/artifacts` | `{artifacts: SessionArtifact[]}` → `Session` | A |
| DELETE | `/api/sessions/{id}` | → 204 | A |
| GET | `/api/speakers` | → `Speaker[]` (global) | R |
| POST | `/api/speakers` | speaker fields → `Speaker` | A |
| PUT | `/api/speakers/{id}` | speaker fields → `Speaker` | A |
| PATCH | `/api/speakers/{id}` | `{visible}` → `Speaker` | A |
| DELETE | `/api/speakers/{id}` | → 204 | A |

### 5.4 Rooms and activities

| Method | Path | Body → Response | Access |
|---|---|---|---|
| GET | `/api/event/rooms?configId=` | → `Room[]` | R |
| POST | `/api/event/rooms` | `{configId, name, colorToken}` → `Room` | A |
| PATCH | `/api/rooms/{id}` | partial → `Room` | A |
| DELETE | `/api/rooms/{id}` | → 204 | A |
| GET | `/api/event/room-mappings?configId=` | → `RoomMappings` | R |
| PUT | `/api/event/room-mappings` | `{configId, keynoteRoomId}` → `RoomMappings` | A |
| POST | `/api/event/rooms/reapply` | `{configId}` → `{sessionsUpdated}` | A |
| GET | `/api/events/{id}/activities` | → `Activity[]` | R |
| POST | `/api/events/{id}/activities` | `{name, description, hours[]}` → `Activity` (no `configId` in body) | A |
| PUT | `/api/activities/{id}` | `{name, description, position}` → `Activity` | A |
| DELETE | `/api/activities/{id}` | → 204 | A |
| PUT | `/api/activities/{id}/hours` | `{hours: [{dayId, startMinute, endMinute}]}` → `ActivityHours[]` (replace) | A |

### 5.5 Shop

| Method | Path | Body → Response | Access |
|---|---|---|---|
| GET | `/api/events/{id}/shop/items` | → `ShopItem[]` | S |
| POST | `/api/events/{id}/shop/items` | item fields → `ShopItem` | S |
| PUT | `/api/events/{id}/shop/items/{itemId}` | `{name, description, price, imageUrl, availableStock, category, maxPerUser, visibility}` → `ShopItem` | S |
| DELETE | `/api/events/{id}/shop/items/{itemId}` | → 204 | S |
| GET | `/api/events/{id}/shop/orders` | → `ShopOrder[]` (contains shipping PII) | S |
| PATCH | `/api/events/{id}/shop/orders/{orderId}/status` | `{status, transactionHash}` → `ShopOrder` | S |

**Not ported:** `POST /api/auth/logout` (the shell owns sign-out), and `POST /api/event/days`,
`PATCH`/`DELETE /api/event/days/{id}` — the source wraps them in `api/days.ts` but no screen calls
them; Settings edits days through the event upsert.

Query keys: `["marketing-ops", "event-platform", <domain>, …]`, one shared `QueryClient`.

---

## 6. Backend prerequisites

Out of scope for the frontend PRs. Each blocks the phase noted; track them with the backend owners.

1. **Access map** (before phase 1 ships to users): add the `eventplatform` feature (§4) to
   `access_map.yaml`, and create the Asgardeo groups per environment.
2. **Agenda-organizer RBAC on the same groups** (before phase 2): the backend already prefers the
   `groups` claim over `roles` (`middleware/auth.go`) and reads its role lists from env, so this is
   configuration, not code — `RBAC_ADMIN_ROLES` = the `eventplatform` group **plus the Marketing Ops
   admin group** (otherwise the frontend's master key shows admins tabs whose calls 403);
   `RBAC_SHOP_ROLES` = the `eventplatform-shop` group; `RBAC_USER_ROLES` empty.
3. **Token acceptance** (before phase 2): the backend validates only `x-jwt-assertion`, never
   `Authorization`. So on the Choreo endpoint one-wso2 calls, "Pass end-user attributes to upstream"
   must be on (console-only, per component and environment), and `JWKS_ENDPOINT` / `JWT_ISSUER` /
   `JWT_AUDIENCE` must describe the **gateway's** assertion, not Asgardeo's token. Confirm by
   decoding what actually arrives.
4. **`email` claim:** the backend 401s any assertion without `email`. Confirm the gateway-minted
   assertion carries it for a one-wso2 user; an access token alone does not.
5. **CORS:** the gateway must allow one-wso2's origin and methods `GET, POST, PUT, PATCH, DELETE`
   (API Configurations → CORS). The backend's own CORS handler only runs in `development`.
6. **Rate limit:** 10 req/s, burst 30, per client IP. With `TRUSTED_PROXIES` unset behind the
   gateway, every user may share one bucket. Set it, or raise the limit, before CSV import is used.

---

## 7. Deliberate differences from the source

- **Navigation.** No sidebars. `DashboardSideBar` → top-level tabs; `EventSidebar` groups → event
  tabs, items → toggle (§2). One rail entry.
- **Theme.** Drop `AcrylicOrangeTheme` and hard-coded colours; theme tokens and
  `theme.applyStyles`, light and dark. `config/colorTokens.ts` names are kept (the backend enforces
  them with a CHECK constraint); their hexes are re-checked against both schemes.
- **Auth.** Remove `AuthProvider`, `AuthGuard`, `RoleGuard`, `AdminGuard`, `useUserRole`,
  `useSignOut`, `useAuthApiClient`, `IdleTimeoutProvider` + `SessionWarningDialog`, and the dev-only
  `x-jwt-assertion` shim. The shell owns sign-in, refresh, idle timeout and sign-out. Roles come from
  the Marketing Ops gate, not a decoded `roles` claim or `window.config.RBAC_*_ROLE`.
- **Roles.** The read-only `user` role is dropped; the source UI already denied it.
- **Mock mode removed.** Every `isMocking()` branch and `api/mock/` go; there is no offline mode.
- **HTTP and errors.** `createApiClient` → `authedGet/…`; `ApiError` → `HttpError`;
  `useNotify` → `useNotifications`; messages via `humanizeHttpError` / `describeError`, never the
  raw body. `api.download` becomes a blob helper over `fetchWithReauth`.
- **Shared components.** `ConfirmationDialog` for `ConfirmDialog`, `ErrorNotice` for errors,
  `MarketingOpsShell` for the frame. Orders stay a plain MUI `Table`.
- **Forms.** Hand-written `useState` forms → `react-hook-form`.
- **Rich text.** `quill` 2 → the repo's `react-quill-new`; `dompurify` kept for render.
- **Config.** The source `public/config.js` is not copied (it holds a real client id); one new key,
  placeholder only, in `config.js.example`.
- **Fixed, not reproduced:**
  - Track-topic rename sends `PATCH /api/track-topics/{id}`, but the backend routes only `PUT`; in
    the source the rename fails. The port sends `PUT`.
  - The agenda palette lists unscheduled sessions with `dayId === null` from **every** event,
    because `useListSessions()` is called unscoped. The port passes `configId`, which the backend
    already supports. Same for Event speakers, which filters client-side today.

---

## 8. Open questions

**Q1. Shop-only users have no event list.** The Events dashboard is admin-only in the source, so a
shop user reaching `/marketing-ops/event-platform` has nowhere to pick an event.

- (a) Open the event switcher to shop users only — still leaves the landing page empty.
- (b) **Recommended:** open the Events tab to shop users as a read-only list (no create, no delete);
  a card opens that event's `firstAllowedPath`, i.e. `shop/inventory`. It needs no backend change:
  `GET /api/events` and `GET /api/events/{id}` are already open to any app member (§5, **R**). The
  Events gate id becomes the any-of `mops-event-platform-shop`, with create/delete checked against
  `mops-event-platform-admin`.

**Q2. `DataGrid` for orders?** Plain `Table` unless asked for.

---

## 9. Phases

One `gh stack` branch and PR per phase.

| # | Phase | Lands |
|---|---|---|
| 0 | Spec | this document |
| 1 | Skeleton | registry entry, capability union + `ITEM_CAPABILITY` any-of, config key + `isEventPlatformConfigured()` + `eventPlatformServiceUrls`, `config.js.example`, `eventPlatformTabs.ts` + tests, `EventPlatformRoute`, route fragment, shell with tab and toggle rows, placeholder leaves |
| 2 | Data layer | the 15 `api/*.ts` files and `types/` on `authedGet/…`, no mocks |
| 3 | Top-level tabs | Events dashboard, speaker library incl. CSV import |
| 4 | Simple event tabs | Event speakers, rooms (`RoomMappingTree`), activities, settings |
| 5 | Agenda | `AgendaBoard`, `useDragDrop`, `useAgendaEditor`, tracks, sections, footnotes, topics, rich text, session CSV import |
| 6 | Shop | inventory (`ItemFormDialog`), orders + `ShopOrderDrawer` |
| 7 | Export + polish | static HTML export (`?raw` runtime, `public/` template), dark-mode pass, Vitest for pure logic |

Phases 3, 4 and 6 can run in parallel once 2 merges.

---

## 10. Risks

- **Token path** (§6.3–6.4): if the toggle is off or the assertion lacks `email`, every call 401s.
  Nothing in the repo shows the toggle's state.
- **Admin master key vs backend** (§6.2): a Marketing Ops admin sees every tab; unless the admin
  group is in `RBAC_ADMIN_ROLES`, those calls 403.
- **Fail-closed gate:** a missing `ITEM_CAPABILITY` line hides the item from everyone.
- **Request fan-out:** track and section deletes unplace sessions with parallel `PUT …/placement`;
  sections load one call per track; CSV imports post row by row. All of it meets the rate limit
  (§6.6).
- **Unscoped lists:** `/api/event/days` and `/api/event/tracks` return every event's rows and grow
  with history; there is no server filter to use.
- **Static export:** depends on the `?raw` import and `public/agenda-template.html` surviving the
  move to one-wso2's Vite build and base path.
- **Oxygen 0.10 → 0.13.1:** `Sidebar` is dropped anyway; check every other `@wso2/oxygen-ui` import
  for API drift.
- **Shipping PII** in orders: keep it out of logs and error messages.
