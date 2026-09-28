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

import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Button,
  InputAdornment,
  ListSubheader,
  Menu,
  MenuItem,
  TextField,
} from "@wso2/oxygen-ui";
import { ChevronDownIcon, SearchIcon } from "@wso2/oxygen-ui-icons-react";
import { useListEvents } from "@features/marketing-ops/event-platform/api/events";
import {
  eventBasePath,
  eventPath,
  parseEventPlatformPath,
} from "@features/marketing-ops/event-platform/eventPlatformTabs";

// The source header's event switcher (components/header/Header.tsx): a
// searchable menu of every event that opens the SAME screen in the chosen one,
// so comparing two events' rooms is one click rather than a trip through the
// list. Any app member may list events, shop operators included, so it needs
// no gate of its own; the destination's route guard still applies.
export default function EventSwitcher({ eventId }: { eventId: string }) {
  const { data: events, isLoading } = useListEvents();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState("");

  const current = events?.find((e) => e.id === eventId);
  const needle = search.trim().toLowerCase();
  const matches = (events ?? []).filter((e) => e.name.toLowerCase().includes(needle));

  const close = () => {
    setAnchor(null);
    setSearch("");
  };

  const open = (id: string) => {
    close();
    const { tab, kind } = parseEventPlatformPath(pathname);
    navigate(tab ? eventPath(id, tab, kind?.kind) : eventBasePath(id));
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        disabled={isLoading || !events?.length}
        endIcon={<ChevronDownIcon size={14} />}
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        sx={{ textTransform: "none" }}
      >
        {current?.name ?? "Switch event"}
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        slotProps={{ paper: { sx: { width: 280 } } }}
      >
        <ListSubheader sx={{ px: 1, pb: 0.5, lineHeight: "normal" }}>
          <TextField
            size="small"
            placeholder="Search events"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            // Menu's type-ahead would otherwise swallow the keystrokes.
            onKeyDown={(e) => e.stopPropagation()}
            autoFocus
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon size={16} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </ListSubheader>
        {matches.length > 0 ? (
          matches.map((evt) => (
            <MenuItem key={evt.id} selected={evt.id === eventId} onClick={() => open(evt.id)}>
              {evt.name}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>No events found</MenuItem>
        )}
      </Menu>
    </>
  );
}
