/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { makeObservable, observable, action, computed } from "mobx";

/**
 * Represents a single workspace wiki page.
 * This will be expanded when the workspace pages API (PP-9) is integrated.
 */
export interface IWorkspaceWikiPage {
  id: string;
  title: string;
  emoji?: string;
  workspace: string;
  created_at?: string;
  updated_at?: string;
}

export interface IWorkspaceWikiPageStore {
  // observables
  pages: Map<string, IWorkspaceWikiPage>;
  isLoading: boolean;
  // computed
  pagesList: IWorkspaceWikiPage[];
  // actions
  fetchPages: (workspaceSlug: string) => Promise<void>;
}

/**
 * Stub store for workspace wiki pages.
 * Returns empty data for now. Will be wired to the real API
 * when PP-9 (workspace pages backend) is complete.
 */
export class WorkspaceWikiPageStore implements IWorkspaceWikiPageStore {
  // observables
  pages: Map<string, IWorkspaceWikiPage> = new Map();
  isLoading = false;

  constructor() {
    makeObservable(this, {
      pages: observable,
      isLoading: observable,
      pagesList: computed,
      fetchPages: action,
    });
  }

  /**
   * Sorted list of workspace wiki pages, derived from the pages map.
   */
  get pagesList(): IWorkspaceWikiPage[] {
    return Array.from(this.pages.values()).sort((a, b) => {
      const aDate = a.updated_at ?? a.created_at ?? "";
      const bDate = b.updated_at ?? b.created_at ?? "";
      return bDate.localeCompare(aDate);
    });
  }

  /**
   * Fetch workspace wiki pages from the API.
   * Currently a no-op stub; will call the workspace pages endpoint once PP-9 ships.
   */
  fetchPages = async (_workspaceSlug: string): Promise<void> => {
    this.isLoading = true;
    try {
      // TODO: Call workspace pages API when PP-9 is ready
      // const response = await workspaceWikiPageService.list(workspaceSlug);
      // runInAction(() => {
      //   response.forEach((page) => this.pages.set(page.id, page));
      // });
    } finally {
      this.isLoading = false;
    }
  };
}
