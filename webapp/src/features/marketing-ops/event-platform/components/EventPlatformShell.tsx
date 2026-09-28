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
import { Alert } from "@wso2/oxygen-ui";
import { MARKETING_OPS_EYEBROW } from "@constants/marketingOpsApps";
import { isEventPlatformConfigured } from "@config/apiConfig";
import MarketingOpsShell from "@features/marketing-ops/components/MarketingOpsShell";

// The page frame for every Event Platform screen. MarketingOpsShell owns the
// four access states, because access is decided by the MARKETING OPS backend's
// /api/me. The data, though, lives on a second backend with a key of its own,
// so its "not connected" state is added here — inside the Marketing Ops one,
// so a caller who may not use Marketing Ops at all is sent away before being
// told about a config key.
export default function EventPlatformShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <MarketingOpsShell eyebrow={MARKETING_OPS_EYEBROW.eventPlatform} title={title} subtitle={subtitle}>
      {isEventPlatformConfigured() ? (
        children
      ) : (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          The Event Platform isn't connected yet. Set{" "}
          <code>ONE_WSO2_EVENT_PLATFORM_BACKEND_URL</code> in <code>public/config.js</code> (the
          agenda-organizer backend URL) and reload.
        </Alert>
      )}
    </MarketingOpsShell>
  );
}
