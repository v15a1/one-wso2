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

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, useLocation } from "react-router";
import type { MarketingOpsGate } from "@features/marketing-ops/api/useMarketingOpsGate";
import { eventPlatformRoutes } from "./routes";

// eventPlatformTabs.test.ts pins what the tabs OFFER. This pins what the ROUTES
// allow, which is the part that is access control: the gate ids are written
// out twice, and a typed URL goes through the routes, not the tabs.

vi.mock("@config/apiConfig", () => ({
  isMarketingOpsBackendConfigured: () => true,
  isEventPlatformConfigured: () => true,
}));

const gate = vi.hoisted(() => ({ value: {} as MarketingOpsGate }));
vi.mock("@features/marketing-ops/api/useMarketingOpsGate", () => ({
  useMarketingOpsGate: () => gate.value,
}));

function gateAllowing(...ids: string[]): MarketingOpsGate {
  return {
    canSee: (id) => ids.includes(id),
    isAuthorized: true,
    isAdmin: false,
    isResolving: false,
    isError: false,
    retry: () => {},
  };
}

const ADMIN = gateAllowing("mops-event-platform-admin", "mops-event-platform-shop");
const SHOP_ONLY = gateAllowing("mops-event-platform-shop");

function UrlProbe() {
  return <div data-testid="url">{useLocation().pathname}</div>;
}

async function visit(path: string, g: MarketingOpsGate) {
  gate.value = g;
  render(
    <MemoryRouter initialEntries={[path]}>
      <UrlProbe />
      <Routes>{eventPlatformRoutes}</Routes>
    </MemoryRouter>,
  );
  // Leaves are lazy, so wait for the chunk rather than the first paint.
  await screen.findByText(/Coming in phase/);
}

const url = () => screen.getByTestId("url").textContent;

describe("the Event Platform routes", () => {
  it("land an admin on the events list", async () => {
    await visit("/marketing-ops/event-platform", ADMIN);
    expect(url()).toBe("/marketing-ops/event-platform/events");
  });

  it("land an admin inside an event at its agenda", async () => {
    await visit("/marketing-ops/event-platform/events/42", ADMIN);
    expect(url()).toBe("/marketing-ops/event-platform/events/42/sessions/agenda");
    expect(screen.getByRole("link", { name: /All events/ })).toBeInTheDocument();
  });

  it("land a shop-only user inside an event at its inventory", async () => {
    await visit("/marketing-ops/event-platform/events/42", SHOP_ONLY);
    expect(url()).toBe("/marketing-ops/event-platform/events/42/shop/inventory");
    // The list would refuse them, so it is not offered.
    expect(screen.queryByRole("link", { name: /All events/ })).not.toBeInTheDocument();
  });

  it("send a shop-only user who types an admin URL to the shop instead", async () => {
    await visit("/marketing-ops/event-platform/events/42/sessions/rooms", SHOP_ONLY);
    expect(url()).toBe("/marketing-ops/event-platform/events/42/shop/inventory");
  });

  it("let a shop-only user open the orders", async () => {
    await visit("/marketing-ops/event-platform/events/42/shop/orders", SHOP_ONLY);
    expect(url()).toBe("/marketing-ops/event-platform/events/42/shop/orders");
    expect(screen.getByText("Shop orders")).toBeInTheDocument();
  });

  it("tell a shop-only user at the top level where the shop is", () => {
    gate.value = SHOP_ONLY;
    render(
      <MemoryRouter initialEntries={["/marketing-ops/event-platform"]}>
        <Routes>{eventPlatformRoutes}</Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/Your role covers event shops/)).toBeInTheDocument();
  });
});
