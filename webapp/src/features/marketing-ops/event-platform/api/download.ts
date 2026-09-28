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

// Authenticated JSON exports saved as files. The export endpoints return JSON,
// but the browser must save it under the name the server picked — so they go
// through fetchWithReauth for the Bearer token and the raw headers, rather than
// authedGet, which parses the body and drops the response.

import { fetchWithReauth, HttpError } from "@api/http";

// `attachment; filename="agenda-2026.json"` → `agenda-2026.json`. Also takes
// the unquoted form. The header is only readable cross-origin when the gateway
// lists it in Access-Control-Expose-Headers; without that it reads as null and
// the fallback is used.
export function filenameFromDisposition(header: string | null, fallback: string): string {
  const match = header?.match(/filename="([^"]+)"/) ?? header?.match(/filename=([^;\s]+)/);
  const name = match?.[1]?.trim();
  return name || fallback;
}

export async function downloadEventPlatformFile(
  url: string,
  accessToken: string,
  fallbackName: string,
): Promise<void> {
  const res = await fetchWithReauth(url, {}, accessToken);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new HttpError(url, res.status, body);
  }
  const filename = filenameFromDisposition(res.headers.get("Content-Disposition"), fallbackName);
  const objectUrl = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on the next macrotask, not synchronously: Safari has been seen to
  // start reading the blob after the click's task ends, and revoking in the
  // same tick saves an empty file (see marketing-ops/events/lib/download).
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
