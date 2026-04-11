/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { set, unset } from "lodash-es";
import { makeObservable, observable, action, computed, runInAction } from "mobx";
// types
import type { TPage } from "@plane/types";
// services
import { WorkspacePageService } from "@/services/page/workspace-page.service";

type TLoader = "init-loader" | "mutation-loader" | undefined;

export interface IWorkspaceWikiPageStore {
  // observables
  data: Record<string, TPage>;
  loader: TLoader;
  error: string | undefined;
  // computed
  pagesList: TPage[];
  // actions
  fetchPages: (workspaceSlug: string) => Promise<TPage[] | undefined>;
  fetchPageById: (workspaceSlug: string, pageId: string) => Promise<TPage | undefined>;
  createPage: (workspaceSlug: string, pageData: Partial<TPage>) => Promise<TPage | undefined>;
  updatePage: (workspaceSlug: string, pageId: string, pageData: Partial<TPage>) => Promise<TPage | undefined>;
  deletePage: (workspaceSlug: string, pageId: string) => Promise<void>;
}

export class WorkspaceWikiPageStore implements IWorkspaceWikiPageStore {
  // observables
  data: Record<string, TPage> = {};
  loader: TLoader = undefined;
  error: string | undefined = undefined;
  // service
  private service: WorkspacePageService;

  constructor() {
    makeObservable(this, {
      data: observable,
      loader: observable.ref,
      error: observable.ref,
      pagesList: computed,
      fetchPages: action,
      fetchPageById: action,
      createPage: action,
      updatePage: action,
      deletePage: action,
    });
    this.service = new WorkspacePageService();
  }

  /**
   * Sorted list of workspace wiki pages (most recently updated first).
   */
  get pagesList(): TPage[] {
    return Object.values(this.data).sort((a, b) => {
      const aDate = a.updated_at?.toString() ?? a.created_at?.toString() ?? "";
      const bDate = b.updated_at?.toString() ?? b.created_at?.toString() ?? "";
      return bDate.localeCompare(aDate);
    });
  }

  /**
   * Fetch all workspace wiki pages.
   */
  fetchPages = async (workspaceSlug: string): Promise<TPage[] | undefined> => {
    try {
      const hasExistingData = Object.keys(this.data).length > 0;
      runInAction(() => {
        this.loader = hasExistingData ? "mutation-loader" : "init-loader";
        this.error = undefined;
      });

      const pages = await this.service.fetchAll(workspaceSlug);

      runInAction(() => {
        for (const page of pages) {
          if (page?.id) {
            set(this.data, [page.id], page);
          }
        }
        this.loader = undefined;
      });

      return pages;
    } catch (error) {
      runInAction(() => {
        this.loader = undefined;
        this.error = "Failed to fetch workspace pages.";
      });
      throw error;
    }
  };

  /**
   * Fetch a single workspace wiki page by ID.
   */
  fetchPageById = async (workspaceSlug: string, pageId: string): Promise<TPage | undefined> => {
    try {
      runInAction(() => {
        this.loader = "mutation-loader";
        this.error = undefined;
      });

      const page = await this.service.fetchById(workspaceSlug, pageId);

      runInAction(() => {
        if (page?.id) {
          set(this.data, [page.id], page);
        }
        this.loader = undefined;
      });

      return page;
    } catch (error) {
      runInAction(() => {
        this.loader = undefined;
        this.error = "Failed to fetch page details.";
      });
      throw error;
    }
  };

  /**
   * Create a new workspace wiki page.
   */
  createPage = async (workspaceSlug: string, pageData: Partial<TPage>): Promise<TPage | undefined> => {
    try {
      runInAction(() => {
        this.loader = "mutation-loader";
        this.error = undefined;
      });

      const page = await this.service.create(workspaceSlug, pageData);

      runInAction(() => {
        if (page?.id) {
          set(this.data, [page.id], page);
        }
        this.loader = undefined;
      });

      return page;
    } catch (error) {
      runInAction(() => {
        this.loader = undefined;
        this.error = "Failed to create page.";
      });
      throw error;
    }
  };

  /**
   * Update a workspace wiki page.
   */
  updatePage = async (
    workspaceSlug: string,
    pageId: string,
    pageData: Partial<TPage>
  ): Promise<TPage | undefined> => {
    // Optimistic update
    const existingPage = this.data[pageId];
    if (existingPage) {
      runInAction(() => {
        set(this.data, [pageId], { ...existingPage, ...pageData });
      });
    }

    try {
      const page = await this.service.update(workspaceSlug, pageId, pageData);

      runInAction(() => {
        if (page?.id) {
          set(this.data, [page.id], page);
        }
      });

      return page;
    } catch (error) {
      // Revert optimistic update
      if (existingPage) {
        runInAction(() => {
          set(this.data, [pageId], existingPage);
        });
      }
      throw error;
    }
  };

  /**
   * Delete a workspace wiki page.
   */
  deletePage = async (workspaceSlug: string, pageId: string): Promise<void> => {
    const existingPage = this.data[pageId];

    try {
      // Optimistic delete
      runInAction(() => {
        unset(this.data, [pageId]);
      });

      await this.service.remove(workspaceSlug, pageId);
    } catch (error) {
      // Revert optimistic delete
      if (existingPage) {
        runInAction(() => {
          set(this.data, [pageId], existingPage);
        });
      }
      throw error;
    }
  };
}
