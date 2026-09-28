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

import { Box, Typography } from "@wso2/oxygen-ui";

// Stands in for a screen whose port has not landed yet, so every route, tab and
// guard can be exercised before any of the screens exist. Each leaf page renders
// one of these until its phase replaces the page body.
export default function ComingSoon({ screen, phase }: { screen: string; phase: number }) {
  return (
    <Box
      sx={{
        border: 1,
        borderStyle: "dashed",
        borderColor: "divider",
        borderRadius: 1.5,
        px: 3,
        py: 4,
      }}
    >
      <Typography variant="subtitle2">{screen}</Typography>
      <Typography variant="body2" color="text.secondary">
        Coming in phase {phase} of the Event Platform port.
      </Typography>
    </Box>
  );
}
