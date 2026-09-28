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
import { renderHook } from "@testing-library/react";
import { useMarketingOpsGate } from "./useMarketingOpsGate";
import type { MarketingOpsMe } from "./marketingOpsTypes";

// The Event Platform is the first item gated on ANY OF two capabilities. These
// pin that the OR holds for its rail entry, that the siblings stay siblings
// everywhere else, and that the admin master key still opens both.

const me = vi.hoisted(() => ({ value: undefined as MarketingOpsMe | undefined }));
vi.mock("./useMarketingOpsMe", () => ({
  useMarketingOpsMe: () => ({
    data: me.value,
    isPending: false,
    isError: false,
    error: null,
    refetch: () => Promise.resolve(),
  }),
}));

function caller(capabilities: string[], isAdmin = false): MarketingOpsMe {
  return {
    sub: "test-sub",
    email: "someone@example.com",
    groups: [],
    authorized: true,
    isAdmin,
    capabilities,
  };
}

function canSeeFor(m: MarketingOpsMe | undefined) {
  me.value = m;
  return renderHook(() => useMarketingOpsGate()).result.current.canSee;
}

describe("the Event Platform gate ids", () => {
  it("shows the rail entry to either role", () => {
    expect(canSeeFor(caller(["eventplatform"]))("mops-event-platform")).toBe(true);
    expect(canSeeFor(caller(["eventplatform-shop"]))("mops-event-platform")).toBe(true);
  });

  it("hides it from a marketing user with neither role", () => {
    expect(canSeeFor(caller(["events"]))("mops-event-platform")).toBe(false);
  });

  it("opens the admin screens to the admin role only", () => {
    expect(canSeeFor(caller(["eventplatform"]))("mops-event-platform-admin")).toBe(true);
    expect(canSeeFor(caller(["eventplatform-shop"]))("mops-event-platform-admin")).toBe(false);
  });

  it("opens the shop to either role", () => {
    expect(canSeeFor(caller(["eventplatform"]))("mops-event-platform-shop")).toBe(true);
    expect(canSeeFor(caller(["eventplatform-shop"]))("mops-event-platform-shop")).toBe(true);
  });

  it("opens everything to a Marketing Ops admin holding no capability", () => {
    const canSee = canSeeFor(caller([], true));
    expect(canSee("mops-event-platform")).toBe(true);
    expect(canSee("mops-event-platform-admin")).toBe(true);
    expect(canSee("mops-event-platform-shop")).toBe(true);
  });

  it("opens nothing to a caller the backend has not authorized", () => {
    const canSee = canSeeFor({ ...caller(["eventplatform"]), authorized: false });
    expect(canSee("mops-event-platform")).toBe(false);
    expect(canSee("mops-event-platform-shop")).toBe(false);
  });
});
