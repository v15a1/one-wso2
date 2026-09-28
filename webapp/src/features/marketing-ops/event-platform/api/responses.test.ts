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

import { describe, expect, it } from "vitest";
import { HttpError } from "@api/http";
import { describeEventPlatformError, expectBody } from "./responses";

const httpError = (status: number, body: string) =>
  new HttpError("https://api.example.com/api/sessions", status, body);

describe("describeEventPlatformError", () => {
  it("reads the backend's flat `error` string", () => {
    expect(describeEventPlatformError(httpError(400, '{"error":"title is required"}'))).toBe(
      "Title is required.",
    );
  });

  it("falls back to describeError for other shapes", () => {
    expect(describeEventPlatformError(httpError(409, '{"message":"Slug taken"}'))).toBe("Slug taken");
    expect(describeEventPlatformError(httpError(502, "<html>Bad gateway</html>"))).toBe(
      "Something went wrong (HTTP 502).",
    );
    expect(describeEventPlatformError(httpError(400, '{"error":"  "}'))).toBe(
      "Something went wrong (HTTP 400).",
    );
  });

  it("describes non-HTTP failures too", () => {
    expect(describeEventPlatformError(new Error("Network down"))).toBe("Network down");
  });
});

describe("expectBody", () => {
  it("passes a body through", () => {
    expect(expectBody({ id: "a" })).toEqual({ id: "a" });
  });

  it("refuses an empty answer where an entity was expected", () => {
    expect(() => expectBody(null)).toThrow(/empty response/);
  });
});
