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

import type { ReactNode } from "react";
import { Link as RouterLink, Navigate, Outlet, useLocation, useParams } from "react-router";
import { Alert, Link, Stack, ToggleButton, ToggleButtonGroup } from "@wso2/oxygen-ui";
import { ArrowLeftIcon } from "@wso2/oxygen-ui-icons-react";
import RoutedTabs from "@components/routed-tabs/RoutedTabs";
import { isMarketingOpsBackendConfigured } from "@config/apiConfig";
import { useMarketingOpsGate } from "@features/marketing-ops/api/useMarketingOpsGate";
import EventPlatformShell from "../components/EventPlatformShell";
import EventSwitcher from "../components/EventSwitcher";
import {
  EVENT_TABS,
  TOP_LEVEL_TABS,
  eventBasePath,
  eventPath,
  eventPlatformPath,
  eventTab,
  firstAllowedPath,
  parseEventPlatformPath,
  topLevelTab,
  visibleKinds,
  visibleTabs,
  type EventPlatformGateId,
  type EventPlatformTabDef,
} from "../eventPlatformTabs";

// The two page frames for the Event Platform — the top level, and inside one
// event — plus the index redirects and the route guard. Inside an event it is
// the Leave pattern (features/leave/pages/LeavePage.tsx): a shell, a tab bar, a
// toggle where a tab offers more than one screen, and an <Outlet /> for
// whichever screen the URL names. At the top level the rail's All Events and
// Speakers items are the navigation, so there is no tab bar there.
//
// The tab bar and toggle are filtered by the same gate that guards the routes,
// so neither offers something the route would refuse — but the route is what
// enforces it. Hiding a control is not access control; the URL can be typed.

// The gate, asked only when there is a Marketing Ops backend to ask. Without
// the flag an unconfigured backend leaves the query disabled, which reads as
// resolving forever — MarketingOpsShell passes the same flag for that reason.
function useEventPlatformGate() {
  return useMarketingOpsGate(isMarketingOpsBackendConfigured());
}

const ADMIN_GATE: EventPlatformGateId = "mops-event-platform-admin";
const SHOP_GATE: EventPlatformGateId = "mops-event-platform-shop";

/** `/marketing-ops/event-platform/*` outside an event: Events or Speakers, picked in the rail. */
export function EventPlatformHomePage() {
  const gate = useEventPlatformGate();
  const { pathname } = useLocation();
  const tabs = visibleTabs(TOP_LEVEL_TABS, gate.canSee);
  const { tab, kind } = parseEventPlatformPath(pathname);

  return (
    // MarketingOpsShell holds its children until the gate answers, so nothing
    // below renders — and no redirect fires — on an unanswered gate.
    <EventPlatformShell title={tab?.label ?? "Event Platform"} subtitle={kind?.subtitle}>
      {tabs.length === 0 ? (
        <NoTopLevelTabs canOpenShop={gate.canSee(SHOP_GATE)} />
      ) : (
        <>
          {tab && (
            <KindToggle
              tab={tab}
              selected={kind?.kind}
              pathFor={(k) => eventPlatformPath(tab, k)}
            />
          )}
          <Outlet />
        </>
      )}
    </EventPlatformShell>
  );
}

// A shop-only user has no top-level screen: the source gave them no events
// list, only the shop of an event they were sent to. Say so rather than
// showing the bare refusal, which would read as having no access at all.
//
// Whether shop users should get a list to pick from is an open question in the
// port plan; until it is settled this is the honest answer.
function NoTopLevelTabs({ canOpenShop }: { canOpenShop: boolean }) {
  if (canOpenShop) {
    return (
      <Alert severity="info">
        Your role covers event shops. Open the shop from a link to its event — the events list is
        for Event Platform admins.
      </Alert>
    );
  }
  return <Alert severity="info">This isn&apos;t available for your role.</Alert>;
}

/** `/marketing-ops/event-platform/events/:eventId/*`: Sessions | Shop | Settings. */
export function EventPlatformEventPage() {
  const gate = useEventPlatformGate();
  const { eventId = "" } = useParams<{ eventId: string }>();
  const { pathname } = useLocation();
  const tabs = visibleTabs(EVENT_TABS, gate.canSee);
  const { tab, kind } = parseEventPlatformPath(pathname);
  // Back to the list only for those who may open it — a shop user following
  // it would be refused on arrival.
  const canSeeList = gate.canSee(ADMIN_GATE);

  return (
    <EventPlatformShell title={tab?.label ?? "Event"} subtitle={kind?.subtitle}>
      {tabs.length === 0 ? (
        <Alert severity="info">This isn&apos;t available for your role.</Alert>
      ) : (
        <>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: "center", justifyContent: "space-between", mb: 1.5 }}
          >
            {canSeeList ? (
              <Link
                component={RouterLink}
                to={eventPlatformPath(topLevelTab("events")!)}
                underline="hover"
                color="text.secondary"
                variant="body2"
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
              >
                <ArrowLeftIcon size={14} />
                All events
              </Link>
            ) : (
              <span />
            )}
            <EventSwitcher eventId={eventId} />
          </Stack>
          <RoutedTabs basePath={eventBasePath(eventId)} tabs={tabs} ariaLabel="Event sections" />
          {tab && (
            <KindToggle
              tab={tab}
              selected={kind?.kind}
              pathFor={(k) => eventPath(eventId, tab, k)}
            />
          )}
          <Outlet />
        </>
      )}
    </EventPlatformShell>
  );
}

/**
 * The sub-views of a tab — Agenda | Speakers | … under Sessions.
 *
 * Links rather than buttons, as in Leave: the choice lives in the URL, so it
 * survives a refresh and comes back with Back. Drawn only when the person may
 * open more than one — a single live option is not a choice.
 */
function KindToggle({
  tab,
  selected,
  pathFor,
}: {
  tab: EventPlatformTabDef;
  selected?: string;
  pathFor: (kind: string) => string;
}) {
  const gate = useEventPlatformGate();
  const kinds = visibleKinds(tab, gate.canSee);
  if (kinds.length < 2) return null;

  return (
    <ToggleButtonGroup
      value={selected ?? false}
      exclusive
      size="small"
      aria-label={`${tab.label} views`}
      sx={{ mb: 2, "& .MuiToggleButton-root": { textTransform: "none", fontSize: 13, px: 1.5, py: 0.4 } }}
    >
      {kinds.map((k) => (
        <ToggleButton
          key={k.kind}
          value={k.kind}
          component={RouterLink}
          to={pathFor(k.kind)}
          replace
          // Anchors, so the current one is marked with aria-current rather than
          // ToggleButtonGroup's aria-pressed, which only means anything on a button.
          aria-current={selected === k.kind ? "page" : undefined}
        >
          {k.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

/**
 * `/marketing-ops/event-platform` itself, or an event reached without a tab:
 * sends the visitor to the first screen they may open there.
 *
 * No `isResolving` branch: the page above holds its <Outlet /> until the gate
 * answers. `null` when there is nowhere to go — the page explains that case.
 */
export function EventPlatformIndex() {
  const gate = useEventPlatformGate();
  const { eventId } = useParams<{ eventId: string }>();
  const first = firstAllowedPath(gate.canSee, eventId);
  if (!first) return null;
  return <Navigate to={first} replace />;
}

/**
 * A multi-kind in-event tab reached without a kind —
 * `/events/42/sessions`. Sends the visitor to the first kind they may open.
 */
export function EventTabIndex({ segment }: { segment: string }) {
  const gate = useEventPlatformGate();
  const { eventId = "" } = useParams<{ eventId: string }>();
  const tab = eventTab(segment);
  const first = tab ? visibleKinds(tab, gate.canSee)[0] : undefined;
  if (!tab || !first) return null;
  return <Navigate to={eventPath(eventId, tab, first.kind)} replace />;
}

/**
 * Guards one screen's route — LeaveKindRoute's contract. A screen the gate
 * refuses redirects to whatever the visitor may open (inside the same event,
 * when the route is inside one), or says so plainly when that is nothing.
 */
export function EventPlatformRoute({
  gateId,
  children,
}: {
  gateId: EventPlatformGateId;
  children: ReactNode;
}) {
  const gate = useEventPlatformGate();
  const { eventId } = useParams<{ eventId: string }>();

  // Decide nothing until the gate has answered. Changing tab remounts this
  // guard, and a redirect taken on an unanswered gate cannot be taken back —
  // see LeaveKindRoute for the long version.
  if (gate.isResolving) return null;

  if (!gate.canSee(gateId)) {
    const first = firstAllowedPath(gate.canSee, eventId);
    if (first) return <Navigate to={first} replace />;
    return <Alert severity="info">This isn&apos;t available for your role.</Alert>;
  }
  return <>{children}</>;
}
