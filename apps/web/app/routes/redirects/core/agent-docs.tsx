/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 *
 * IW: PP-71 → AI restructure. The "Agent Docs" page was renamed to
 * "AI" and split into sections (today only VAULTS). Old bookmarks
 * /agent-docs and /agent-docs/?path=… stay alive by redirecting to
 * the equivalent VAULTS URL with the query string preserved.
 */

import { redirect } from "react-router";
import type { Route } from "./+types/agent-docs";

export const clientLoader = ({ params, request }: Route.ClientLoaderArgs) => {
  const { workspaceSlug } = params;
  const url = new URL(request.url);
  const search = url.search; // includes leading "?" or "" if absent
  throw redirect(`/${workspaceSlug}/ai/vaults${search}`);
};

export default function AgentDocs() {
  return null;
}
