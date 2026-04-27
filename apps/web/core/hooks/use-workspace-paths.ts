/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useParams, usePathname } from "next/navigation";

/**
 * Custom hook to detect different workspace paths
 * @returns Object containing boolean flags for different workspace paths
 */
export const useWorkspacePaths = () => {
  const { workspaceSlug } = useParams();
  const pathname = usePathname();

  const isSettingsPath = pathname.includes(`/${workspaceSlug}/settings`);
  const isWikiPath = pathname.includes(`/${workspaceSlug}/wiki`);
  // IW: AI workspace lives at /<slug>/ai (renamed from /agent-docs).
  // Match exact `/ai` segment so unrelated paths containing the substring
  // (e.g. /<slug>/airline) don't accidentally activate the AI rail.
  const isAIPath = pathname === `/${workspaceSlug}/ai` || pathname.startsWith(`/${workspaceSlug}/ai/`);
  // Legacy alias — old /agent-docs URLs still flag AI as active until the
  // route fully redirects. Keeps the side rail highlighted during transit.
  const isAgentDocsPath = pathname.includes(`/${workspaceSlug}/agent-docs`);
  const isPiChatPath = pathname.includes(`/${workspaceSlug}/pi-chat`);
  const isProjectsPath =
    pathname.includes(`/${workspaceSlug}/`) &&
    !isWikiPath &&
    !isAIPath &&
    !isAgentDocsPath &&
    !isPiChatPath &&
    !isSettingsPath;
  const isNotificationsPath = pathname.includes(`/${workspaceSlug}/notifications`);

  return {
    isSettingsPath,
    isWikiPath,
    isAIPath,
    isAgentDocsPath,
    isPiChatPath,
    isProjectsPath,
    isNotificationsPath,
  };
};
