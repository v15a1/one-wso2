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

import { Button } from "@wso2/oxygen-ui";
import { ChevronDownIcon } from "@wso2/oxygen-ui-icons-react";

// The slot for the source header's event switcher (components/header/Header.tsx:
// a searchable menu of every event that navigates to the same screen in the
// chosen one). A disabled placeholder until the data layer can list events
// from eventPlatformServiceUrls.events and name the current one — the id is
// all the skeleton knows.
export default function EventSwitcher({ eventId }: { eventId: string }) {
  return (
    <Button
      variant="outlined"
      size="small"
      disabled
      endIcon={<ChevronDownIcon size={14} />}
      sx={{ textTransform: "none" }}
    >
      Event {eventId}
    </Button>
  );
}
