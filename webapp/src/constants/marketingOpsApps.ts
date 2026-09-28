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

// Registry of the Marketing Ops operations and their top-level menu items,
// surfaced inside the One WSO2 Marketing Ops perspective. Same model as
// FINANCE_APPS — one MenuApp per operation, its sub-screens as items — and for
// the same reason: the left rail (via appsToSections in @constants/perspectives),
// the waffle and the overview page all derive from this one array, so they
// cannot drift apart.
//
// Transcribed from the Marketing Ops frontend's own operation registry and
// routes (digiops-marketing/agents/marketing-ops/frontend), which already
// splits operations into sub-routes the same way (/operations/events/mine,
// /operations/events/review).
//
// ---- on `requires` -------------------------------------------------------
//
// `requires` takes One WSO2 capabilities (employee/lead/serviceDesk/admin),
// which are derived from people-app privilege numbers and have NOTHING to do
// with Marketing Ops' Asgardeo groups. That mismatch is deliberate and matches
// how Finance handles its three backends: the value here is a coarse hint for
// anything that renders the registry generically, while the REAL decision is
// made by useMarketingOpsGate against this backend's own /api/me capabilities.
//
// So: `requires: ["admin"]` here means "restricted", and the gate decides who
// actually sees it. An item that declares `requires` but is missing from the
// gate's explicit mapping is HIDDEN, never shown — see RESTRICTED_IDS there.
//
// ---- paths ---------------------------------------------------------------
//
// An item with a `path` tells the rail there's a route to navigate to, so
// adding one before the route exists produces a rail entry that leads to a
// blank page. Every item now has one — all five operations are ported — but a
// future item should stay path-less until its route lands.
//
// ---- order ---------------------------------------------------------------
//
// THIS ARRAY'S ORDER IS THE DISPLAY ORDER, in the left rail, the waffle and the
// overview page alike. It is Sarindu's, chosen by how much the operations are
// used rather than by name or by the order they were ported in: Email
// Workbench, Ad Campaigns, Events, CRM Upload, then Utilities, with Marketing
// Admin last because it configures the rest. Don't sort it.

import {
  CalendarRangeIcon,
  ChartNoAxesCombinedIcon,
  MegaphoneIcon,
  PaletteIcon,
  RefreshCwIcon,
  SettingsIcon,
  TicketIcon,
  WrenchIcon,
} from "@wso2/oxygen-ui-icons-react";
import type { MenuApp } from "@constants/appMenu";

export const MARKETING_OPS_APPS: readonly MenuApp[] = [
  {
    key: "email-workbench",
    name: "Email Workbench",
    icon: MegaphoneIcon,
    purpose:
      "Compose marketing emails from reusable blocks and sync them to Pardot with a faithful plain-text alternative.",
    items: [
      // Phase 3 — ported. Gate: marketing-ops capability `emailworkbench`.
      //
      // Three items rather than the two originally planned, because the source has
      // three genuinely different jobs: composing FROM a template, revisiting your
      // OWN drafts, and curating the templates themselves. The editor is not an item
      // — it's an immersive workspace reached by opening a template or a draft.
      {
        id: "mops-email-create",
        label: "Create an Email",
        desc: "Start from an approved template, edit its content, and push the finished email to Pardot.",
        requires: ["admin"],
        path: "/marketing-ops/email-workbench/create",
      },
      {
        id: "mops-email-history",
        label: "My Emails",
        desc: "Your own drafts and completed emails, with their Pardot sync state.",
        requires: ["admin"],
        path: "/marketing-ops/email-workbench/history",
      },
      {
        id: "mops-email-manage",
        label: "Manage Templates",
        desc: "Onboard, edit or remove the approved templates marketers build from.",
        requires: ["admin"],
        path: "/marketing-ops/email-workbench/manage",
      },
      // The block catalog belongs to the operation, not to Marketing Admin: it is
      // where an editor's building blocks are maintained, and Marketing Ops has it
      // as a sub-operation of Email Workbench at the matching path. Its backend
      // router is mounted under the operation's own guard, so the capability is
      // `emailworkbench` — the same one the other three items need.
      {
        id: "mops-email-blocks",
        label: "Block Catalog",
        desc: "The components the email editor offers. Editing a block changes what future emails insert.",
        requires: ["admin"],
        path: "/marketing-ops/email-workbench/blocks",
      },
    ],
  },
  {
    key: "ad-campaigns",
    name: "Ad Campaigns",
    icon: ChartNoAxesCombinedIcon,
    // Analytics is the first of several screens planned here, so the rail keeps
    // "Ad Campaigns" expandable with "Analytics" nested under it rather than
    // collapsing the two into one entry.
    alwaysGroup: true,
    purpose:
      "Cross-channel paid campaign performance — spend, reach and conversion pulled from the connected ad platforms.",
    items: [
      // Phase 2 — ported. Computed live on every view; nothing is stored, so
      // there is no draft state and no mutation. Note the backend endpoints are
      // POSTs despite being reads (the report config is the body) — see
      // marketingOpsServiceUrls.adAnalytics* in @config/apiConfig.
      // Gate: marketing-ops capability `adcampaigns`.
      {
        id: "mops-ad-analytics",
        label: "Analytics",
        desc: "Paid-ad performance across Google Ads and LinkedIn, with the Salesforce funnel and ROI for Google.",
        requires: ["admin"],
        path: "/marketing-ops/ad-campaigns/analytics",
      },
      // Same capability gate as Analytics (`adcampaigns`) — same backend,
      // same operation, a different screen.
      {
        id: "mops-campaign-tracker",
        label: "Campaign Tracker",
        desc: "Weekly operating rhythm for live campaigns — register, weekly change log, and budget pacing for Google Ads and LinkedIn.",
        requires: ["admin"],
        path: "/marketing-ops/ad-campaigns/campaign-tracker",
      },
    ],
  },
  {
    key: "events",
    name: "Events",
    icon: TicketIcon,
    purpose:
      "Turn event attendee workbooks into validated, reviewable lists ready for Pardot import.",
    items: [
      // Phase 4. Two SIBLING capabilities, not a hierarchy: `events` covers
      // submitting your own lists, `events-review` covers reviewing others'.
      // Neither implies the other — a reviewer holds both groups because the
      // operation's router is gated on `events`. See access_map.yaml.
      {
        id: "mops-events-mine",
        label: "My Submissions",
        desc: "Upload an attendee workbook and track your submitted lists.",
        requires: ["admin"],
        path: "/marketing-ops/events/mine",
      },
      {
        id: "mops-events-review",
        label: "Review Queue",
        desc: "Review submitted attendee lists, approve or send back, and export for Pardot.",
        requires: ["admin"],
        path: "/marketing-ops/events/review",
      },
    ],
  },
  {
    // The agenda-organizer port — a different app from Events above (attendee
    // workbooks), which is why its ids are `mops-event-platform*` and never
    // `mops-events-*`. Placed next to Events because the two are used by the
    // same people around the same events.
    key: "event-platform",
    name: "Event Platform",
    icon: CalendarRangeIcon,
    purpose:
      "Plan an event's agenda, speakers, rooms and activities, and run its swag shop.",
    // A shop-only user sees one item; keep it inside the group so the
    // operation's shape doesn't change with the caller's role.
    alwaysGroup: true,
    items: [
      // The source's DashboardSideBar, as rail items rather than a tab row, so
      // the operation reads as a group like its neighbours. Inside an event the
      // tabs take over — see event-platform/eventPlatformTabs.ts.
      //
      // All Events opens for either role, so a shop-only user still has a way
      // in; Speakers is admin-only, as in the source.
      {
        id: "mops-event-platform-events",
        label: "All Events",
        desc: "Every event on the platform — open one to plan its agenda or run its shop.",
        requires: ["admin"],
        path: "/marketing-ops/event-platform/events",
      },
      {
        id: "mops-event-platform-speakers",
        label: "Speakers",
        desc: "The speaker library shared by every event.",
        requires: ["admin"],
        path: "/marketing-ops/event-platform/speakers",
      },
    ],
  },
  {
    key: "crm-upload",
    name: "CRM Upload",
    icon: RefreshCwIcon,
    purpose:
      "Ingest lead and contact records into the CRM through validated pipelines with a duplicate review step.",
    items: [
      // Phase 5. Gate: marketing-ops capability `crmupload` — one capability for all
      // four screens. This is the marketing team's own tooling; unlike Events there
      // is nobody submitting into it, so there is no submitter/reviewer split.
      //
      // Marketing Ops shipped these as four tabs on one page, and had the first two
      // named the other way round: its "Last Run" tab is the state of the two
      // pipelines, and its "Pipelines" tab is a history of runs. These four items
      // were scaffolded with the accurate names before the port, so the port follows
      // them rather than the source's labels.
      {
        id: "mops-crm-pipelines",
        label: "Pipelines",
        desc: "The lead and account schedulers, where each one stands, and a manual trigger.",
        requires: ["admin"],
        path: "/marketing-ops/crm-upload/pipelines",
      },
      {
        id: "mops-crm-review",
        label: "Review Queue",
        desc: "Resolve duplicate and conflicting records before they reach the CRM.",
        requires: ["admin"],
        path: "/marketing-ops/crm-upload/review",
      },
      {
        id: "mops-crm-records",
        label: "Records",
        desc: "Records ingested through the upload pipelines.",
        requires: ["admin"],
        path: "/marketing-ops/crm-upload/records",
      },
      {
        id: "mops-crm-runs",
        label: "Run Log",
        desc: "History of pipeline runs and their outcomes.",
        requires: ["admin"],
        path: "/marketing-ops/crm-upload/runs",
      },
    ],
  },
  {
    key: "design-studio",
    name: "Design Studio",
    icon: PaletteIcon,
    purpose:
      "Build branded LinkedIn post and banner graphics from the shared background-image library.",
    items: [
      {
        id: "mops-design-studio-post-builder",
        label: "Post Builder",
        desc: "Design a LinkedIn post or banner — pick a type, fill in content, choose a background, and export.",
        requires: ["admin"],
        path: "/marketing-ops/design-studio/post-builder",
      },
    ],
  },
  {
    key: "utilities",
    name: "Utilities",
    icon: WrenchIcon,
    purpose:
      "Everyday marketing generators — build consistent UTM links and asset names from the admin-maintained parameter lists.",
    items: [
      // Phase 1. No `requires`: Marketing Ops grants utilities to anyone who can
      // log in at all (the marketing baseline group is documented as "login +
      // all utilities, nothing else"), so these are open to any authorized
      // caller rather than capability-gated.
      {
        id: "mops-utm",
        label: "UTM Link Generator",
        desc: "Build a tagged campaign URL from the approved source, medium, region and business-unit values.",
        path: "/marketing-ops/utilities/utm",
      },
      {
        id: "mops-asset-name",
        label: "Asset Name Generator",
        desc: "Compose a consistent asset name from the per-asset-type naming lists.",
        path: "/marketing-ops/utilities/asset-name",
      },
    ],
  },
  {
    key: "admin",
    name: "Marketing Admin",
    icon: SettingsIcon,
    purpose:
      "Administer the parameter lists, send defaults and import contracts the Marketing Ops operations run on.",
    items: [
      // Named "Marketing Admin" rather than "Settings" or "Administration
      // Panel" on purpose: One WSO2's own Settings section is a separate,
      // undecided question, and "Administration Panel" would read as though it
      // administers One WSO2 itself. This name states its scope and won't need
      // renaming when the platform-wide Settings arrives.
      //
      // This app's item list grows by one line per phase — each operation's
      // configuration panel lands WITH that operation, never as a deferred
      // settings phase, so no phase ever ships an operation whose configuration
      // can't be edited.
      //
      // Every item here is admin-only. Gate: `isAdmin` from /api/me — the
      // Marketing Ops admin group is the only thing that grants Settings.
      //
      // Phase 4 adds: Events member statuses + per-status column definitions
      //               (the import contract, not cosmetic config).
      // Deferred:     External System Log (a compliance record) and Access
      //               Reference (a which-group-do-I-need diagnostic). Neither
      //               is marketing configuration; both are candidates for
      //               whatever One WSO2 Settings becomes, and stay reachable in
      //               Marketing Ops meanwhile.
      {
        id: "mops-admin-utm",
        label: "UTM Generator Lists",
        desc: "Source, Medium, Region and Business Unit values offered by the UTM Link Generator.",
        requires: ["admin"],
        path: "/marketing-ops/admin/utm",
      },
      {
        id: "mops-admin-asset-name",
        label: "Asset Name Lists",
        desc: "Per-generator dropdown values for the Asset Name Generator.",
        requires: ["admin"],
        path: "/marketing-ops/admin/asset-name",
      },
      // Phase 3 — Email Workbench's two admin surfaces. Both land here rather than
      // inside the operation because they configure it rather than use it.
      {
        id: "mops-admin-pardot",
        label: "Pardot Send Defaults",
        desc: "Campaign, tracker domain, email types and sender applied to every email pushed to Pardot.",
        requires: ["admin"],
        path: "/marketing-ops/admin/pardot",
      },
      // Phase 4 — the Events import contract. Not cosmetic config: the member
      // statuses and their column definitions decide which workbook tabs are read
      // at all and what each is allowed to contain, so it ships with the operation.
      {
        id: "mops-admin-events",
        label: "Events Statuses & Columns",
        desc: "Member statuses and the per-status columns an attendee workbook must carry to be imported.",
        requires: ["admin"],
        path: "/marketing-ops/admin/events",
      },
    ],
  },
];

// Eyebrow descriptors for MarketingOpsShell, derived from the registry above so
// the chip on every Marketing Ops screen can't drift from the operation's own
// name and icon. Same helper and same reason as FINANCE_EYEBROW in
// @constants/financeApps — and the icon is the reason it exists: the chip used
// to carry a hardcoded emoji per page ("📣 Email Workbench"), which said nothing
// the rail's Lucide icon didn't already say, in a different visual language.
function eyebrowFor(key: string): { icon: MenuApp["icon"]; label: string } {
  const app = MARKETING_OPS_APPS.find((a) => a.key === key)!;
  return { icon: app.icon, label: app.name };
}

export const MARKETING_OPS_EYEBROW = {
  emailWorkbench: eyebrowFor("email-workbench"),
  adCampaigns: eyebrowFor("ad-campaigns"),
  events: eyebrowFor("events"),
  eventPlatform: eyebrowFor("event-platform"),
  crmUpload: eyebrowFor("crm-upload"),
  designStudio: eyebrowFor("design-studio"),
  utilities: eyebrowFor("utilities"),
  admin: eyebrowFor("admin"),
} as const;
