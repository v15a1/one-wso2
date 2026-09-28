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

// What every Event Platform hook shares: when it may fire, how it gets a
// token, and how a failure reaches a toast.

import { useCallback } from "react";
import { useAsgardeo } from "@asgardeo/react";
import { useAccessToken } from "@hooks/useAccessToken";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { isEventPlatformConfigured } from "@config/apiConfig";
import { describeEventPlatformError } from "@features/marketing-ops/event-platform/api/responses";

// No `sub` in any key: nothing this backend returns is per-user. Events,
// speakers and shop data read the same for every admin or shop operator.
export function useEventPlatformBase() {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const ready = isSignedIn && isEventPlatformConfigured();
  return { getAccessToken, ready };
}

// The source handed every mutation a `notify` callback to raise its own
// "failed — reverted" toast. Here the hook reaches the shared notifications
// itself, so callers can't forget to wire it.
export function useNotifyFailure() {
  const { showError } = useNotifications();
  return useCallback(
    (what: string, err: unknown) => showError(`${what} ${describeEventPlatformError(err)}`),
    [showError],
  );
}
