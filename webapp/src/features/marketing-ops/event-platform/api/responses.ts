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

// How the agenda-organizer's responses are read: its error shape, and what an
// empty 2xx means. Pure, so it is tested without a QueryClient or Asgardeo.

import { describeError } from "@api/errors";
import { HttpError } from "@api/http";

// The agenda-organizer answers errors as `{"error": "<short reason>"}` — a
// flat string, which describeError (built for `{message}` and UMT's nested
// `{error: {message}}`) does not read. The reasons are the handlers' own
// fixed strings ("title is required", "configId is required when
// scheduled=false", a duplicate slug), never a stack or a query, so they are
// safe to show and far more useful than a bare status. Anything else falls
// through to describeError unchanged.
export function describeEventPlatformError(err: unknown): string {
  if (err instanceof HttpError && err.responseBody) {
    try {
      const parsed = JSON.parse(err.responseBody) as { error?: unknown };
      if (typeof parsed?.error === "string" && parsed.error.trim()) {
        const reason = parsed.error.trim();
        return `${reason.charAt(0).toUpperCase()}${reason.slice(1)}.`;
      }
    } catch {
      // Not JSON — describeError gives the status-only message.
    }
  }
  return describeError(err);
}

// authedPost/Put/Patch return null for a 204 or an empty body. Every write the
// cache is patched from must return the entity, so an empty answer there is a
// failure to surface, not a value to store.
export function expectBody<T>(value: T | null): T {
  if (value === null) throw new Error("The Event Platform returned an empty response.");
  return value;
}
