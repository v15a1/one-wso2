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

import { Suspense, lazy, type ComponentType, type LazyExoticComponent } from "react";
import { Route } from "react-router";
import { Skeleton } from "@wso2/oxygen-ui";
import {
  EventPlatformEventPage,
  EventPlatformHomePage,
  EventPlatformIndex,
  EventPlatformRoute,
  EventTabIndex,
} from "./pages/EventPlatformPages";
import { EVENT_PLATFORM_PATH, type EventPlatformGateId } from "./eventPlatformTabs";

// Every leaf is lazy: the finished screens pull in a drag-and-drop board, a
// rich-text editor and the static-export templates, and only the few people
// who hold an Event Platform role should pay for them.
const EventsDashboardPage = lazy(() => import("./pages/EventsDashboardPage"));
const SpeakerLibraryPage = lazy(() => import("./pages/SpeakerLibraryPage"));
const SessionEditorPage = lazy(() => import("./pages/SessionEditorPage"));
const EventSpeakersPage = lazy(() => import("./pages/EventSpeakersPage"));
const RoomsPage = lazy(() => import("./pages/RoomsPage"));
const ActivitiesPage = lazy(() => import("./pages/ActivitiesPage"));
const EventExportPage = lazy(() => import("./pages/EventExportPage"));
const ShopInventoryPage = lazy(() => import("./pages/ShopInventoryPage"));
const ShopOrdersPage = lazy(() => import("./pages/ShopOrdersPage"));
const EventSettingsPage = lazy(() => import("./pages/EventSettingsPage"));

// One guarded, lazy leaf. Skeleton rather than null while the chunk loads: a
// blank frame reads as a broken link.
function leaf(gateId: EventPlatformGateId, Page: LazyExoticComponent<ComponentType>) {
  return (
    <EventPlatformRoute gateId={gateId}>
      <Suspense fallback={<Skeleton variant="rectangular" height={220} sx={{ borderRadius: 1.5 }} />}>
        <Page />
      </Suspense>
    </EventPlatformRoute>
  );
}

// The gate ids repeat eventPlatformTabs.ts on purpose — that file decides what
// the tabs OFFER, these decide what the routes ALLOW, and the tests there pin
// which kinds belong to the shop.
const ADMIN: EventPlatformGateId = "mops-event-platform-admin";
const SHOP: EventPlatformGateId = "mops-event-platform-shop";

// Event Platform routes, spread into App.tsx. Owned by the feature, as the GRC
// modules own theirs, because this tree is deeper than App.tsx should carry.
// Single-kind tabs (Events, Speakers, Settings) have no kind segment.
export const eventPlatformRoutes = (
  <Route path={EVENT_PLATFORM_PATH.slice(1)}>
    <Route element={<EventPlatformHomePage />}>
      <Route index element={<EventPlatformIndex />} />
      <Route path="events" element={leaf(ADMIN, EventsDashboardPage)} />
      <Route path="speakers" element={leaf(ADMIN, SpeakerLibraryPage)} />
    </Route>

    <Route path="events/:eventId" element={<EventPlatformEventPage />}>
      <Route index element={<EventPlatformIndex />} />
      <Route path="sessions">
        <Route index element={<EventTabIndex segment="sessions" />} />
        <Route path="agenda" element={leaf(ADMIN, SessionEditorPage)} />
        <Route path="speakers" element={leaf(ADMIN, EventSpeakersPage)} />
        <Route path="rooms" element={leaf(ADMIN, RoomsPage)} />
        <Route path="activities" element={leaf(ADMIN, ActivitiesPage)} />
        <Route path="export" element={leaf(ADMIN, EventExportPage)} />
      </Route>
      <Route path="shop">
        <Route index element={<EventTabIndex segment="shop" />} />
        <Route path="inventory" element={leaf(SHOP, ShopInventoryPage)} />
        <Route path="orders" element={leaf(SHOP, ShopOrdersPage)} />
      </Route>
      <Route path="settings" element={leaf(ADMIN, EventSettingsPage)} />
    </Route>
  </Route>
);
