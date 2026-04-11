/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useContext } from "react";
// context
import { StoreContext } from "@/lib/store-context";
// store
import type { IWorkspaceWikiPageStore } from "@/store/wiki";

/**
 * Hook to access the workspace wiki pages store from the root MobX store context.
 */
export const useWorkspaceWikiPages = (): IWorkspaceWikiPageStore => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useWorkspaceWikiPages must be used within StoreProvider");
  return context.workspaceWikiPages;
};
