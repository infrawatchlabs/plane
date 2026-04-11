/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo } from "react";
import type { IWorkspaceWikiPage } from "@/store/wiki";
import { WorkspaceWikiPageStore } from "@/store/wiki";

/**
 * Singleton instance of the workspace wiki page store.
 * This will be migrated to a proper store context once the root store
 * is updated to include the wiki store (when PP-9 API lands).
 */
let storeInstance: WorkspaceWikiPageStore | null = null;

function getStore(): WorkspaceWikiPageStore {
  if (!storeInstance) {
    storeInstance = new WorkspaceWikiPageStore();
  }
  return storeInstance;
}

/**
 * Hook to access workspace wiki pages.
 * Returns the pages list and loading state.
 * Currently returns empty data; will be populated once the API is ready.
 */
export const useWorkspaceWikiPages = (): {
  pages: IWorkspaceWikiPage[];
  isLoading: boolean;
  fetchPages: (workspaceSlug: string) => Promise<void>;
} => {
  const store = useMemo(() => getStore(), []);

  return {
    pages: store.pagesList,
    isLoading: store.isLoading,
    fetchPages: store.fetchPages,
  };
};
