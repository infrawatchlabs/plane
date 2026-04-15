/**
 * PP-3: PageFolderStore — MobX store for wiki folder hierarchy.
 * Manages folder CRUD, page-to-folder mapping, and tree state (expanded/collapsed).
 *
 * NOTE: expandedFolders uses observable.ref with immutable replacement.
 * This ensures MobX observer components always re-render on toggle,
 * avoiding issues with ObservableMap tracking in nested observer components.
 */

import { unset } from "lodash-es";
import { makeObservable, observable, runInAction, action, computed, set } from "mobx";
import { computedFn } from "mobx-utils";
// types
import type { TPageFolder, TPageFolderCreatePayload, TPageFolderUpdatePayload } from "./iw-page-folder.types";
// service
import { PageFolderService } from "@/services/page/iw-page-folder.service";

type TLoader = "init-loader" | "mutation-loader" | undefined;

const MAX_NESTING_DEPTH = 4;

// localStorage key for expanded state
const EXPANDED_STATE_KEY = "iw_page_folders_expanded";

// localStorage key for page-to-folder mapping (mock only — backend will have folder_id on Page model)
const PAGE_FOLDER_MAP_KEY = "iw_page_folder_map";

function loadExpandedState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(EXPANDED_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveExpandedState(state: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EXPANDED_STATE_KEY, JSON.stringify(state));
  } catch {
    // silently ignore
  }
}

function loadPageFolderMap(): Record<string, string | null> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PAGE_FOLDER_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePageFolderMap(map: Record<string, string | null>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PAGE_FOLDER_MAP_KEY, JSON.stringify(map));
  } catch {
    // silently ignore
  }
}

export interface IPageFolderStore {
  // observables
  loader: TLoader;
  folders: Record<string, TPageFolder>;
  expandedFolders: Record<string, boolean>;
  pageFolderMap: Record<string, string | null>; // pageId => folderId (null = root)
  // computed
  rootFolderIds: string[];
  // helpers
  getFolderById: (folderId: string) => TPageFolder | undefined;
  getChildFolderIds: (parentFolderId: string | null) => string[];
  getPageIdsInFolder: (folderId: string | null) => string[];
  getFolderDepth: (folderId: string) => number;
  getFolderPath: (folderId: string | null) => TPageFolder[];
  getPageFolderId: (pageId: string) => string | null;
  isFolderExpanded: (folderId: string) => boolean;
  // actions
  toggleFolderExpanded: (folderId: string) => void;
  setFolderExpanded: (folderId: string, expanded: boolean) => void;
  fetchFolders: (workspaceSlug: string) => Promise<void>;
  createFolder: (workspaceSlug: string, payload: TPageFolderCreatePayload) => Promise<TPageFolder>;
  updateFolder: (workspaceSlug: string, folderId: string, payload: TPageFolderUpdatePayload) => Promise<TPageFolder>;
  removeFolder: (workspaceSlug: string, folderId: string) => Promise<void>;
  movePageToFolder: (workspaceSlug: string, pageId: string, folderId: string | null) => Promise<void>;
  removePageFromMap: (pageId: string) => void;
}

export class PageFolderStore implements IPageFolderStore {
  // observables
  loader: TLoader = undefined;
  folders: Record<string, TPageFolder> = {};
  // observable.ref — tracked by reference. Every toggle creates a new object → triggers re-render.
  expandedFolders: Record<string, boolean> = {};
  pageFolderMap: Record<string, string | null> = {};
  // service
  private service: PageFolderService;

  constructor() {
    makeObservable(this, {
      // observables
      loader: observable.ref,
      folders: observable,
      expandedFolders: observable.ref, // track by reference — immutable replacement on every change
      pageFolderMap: observable,
      // computed
      rootFolderIds: computed,
      // actions
      toggleFolderExpanded: action,
      setFolderExpanded: action,
      fetchFolders: action,
      createFolder: action,
      updateFolder: action,
      removeFolder: action,
      movePageToFolder: action,
      removePageFromMap: action,
    });
    this.service = new PageFolderService();
    // Load persisted state
    this.expandedFolders = loadExpandedState();
    const savedPageMap = loadPageFolderMap();
    for (const [key, value] of Object.entries(savedPageMap)) {
      set(this.pageFolderMap, key, value);
    }
  }

  /**
   * Root-level folder IDs (no parent), sorted alphabetically.
   */
  get rootFolderIds(): string[] {
    return Object.values(this.folders)
      .filter((f) => f.parent_folder === null)
      .toSorted((a: TPageFolder, b: TPageFolder) => a.name.localeCompare(b.name))
      .map((f: TPageFolder) => f.id);
  }

  /**
   * Get folder by ID.
   */
  getFolderById = computedFn((folderId: string): TPageFolder | undefined => this.folders[folderId]);

  /**
   * Get child folder IDs of a given parent, sorted alphabetically.
   */
  getChildFolderIds = computedFn((parentFolderId: string | null): string[] =>
    Object.values(this.folders)
      .filter((f) => f.parent_folder === parentFolderId)
      .toSorted((a: TPageFolder, b: TPageFolder) => a.name.localeCompare(b.name))
      .map((f: TPageFolder) => f.id)
  );

  /**
   * Get page IDs inside a specific folder (null = root pages).
   */
  getPageIdsInFolder = computedFn((folderId: string | null): string[] => {
    const result: string[] = [];
    for (const [pageId, mappedFolderId] of Object.entries(this.pageFolderMap)) {
      if (mappedFolderId === folderId) {
        result.push(pageId);
      }
    }
    return result;
  });

  /**
   * Compute depth of a folder (1-based: root children are depth 1).
   */
  getFolderDepth = (folderId: string): number => {
    let depth = 0;
    let currentId: string | null = folderId;
    while (currentId) {
      depth++;
      const folder: TPageFolder | undefined = this.folders[currentId];
      currentId = folder?.parent_folder ?? null;
    }
    return depth;
  };

  /**
   * Get the full path of folders from root to the given folder.
   */
  getFolderPath = computedFn((folderId: string | null): TPageFolder[] => {
    const path: TPageFolder[] = [];
    let currentId = folderId;
    while (currentId) {
      const folder = this.folders[currentId];
      if (!folder) break;
      path.unshift(folder);
      currentId = folder.parent_folder;
    }
    return path;
  });

  /**
   * Get the folder ID for a page (null = root).
   */
  getPageFolderId = computedFn((pageId: string): string | null => this.pageFolderMap[pageId] ?? null);

  /**
   * Check if a folder is expanded.
   */
  isFolderExpanded = (folderId: string): boolean => !!this.expandedFolders[folderId];

  /**
   * Toggle folder expanded/collapsed state. Replaces the entire object to trigger observable.ref.
   */
  toggleFolderExpanded = (folderId: string): void => {
    const current = !!this.expandedFolders[folderId];
    const next = { ...this.expandedFolders, [folderId]: !current };
    this.expandedFolders = next;
    saveExpandedState(next);
  };

  /**
   * Set folder expanded state explicitly.
   */
  setFolderExpanded = (folderId: string, expanded: boolean): void => {
    const next = { ...this.expandedFolders, [folderId]: expanded };
    this.expandedFolders = next;
    saveExpandedState(next);
  };

  /**
   * Fetch all folders for a workspace.
   */
  fetchFolders = async (workspaceSlug: string): Promise<void> => {
    try {
      const hasData = Object.keys(this.folders).length > 0;
      runInAction(() => {
        this.loader = hasData ? "mutation-loader" : "init-loader";
      });

      const folders = await this.service.fetchAll(workspaceSlug);
      runInAction(() => {
        for (const folder of folders) {
          set(this.folders, folder.id, folder);
        }
        this.loader = undefined;
      });
    } catch (error) {
      runInAction(() => {
        this.loader = undefined;
      });
      throw error;
    }
  };

  /**
   * Create a new folder.
   */
  createFolder = async (workspaceSlug: string, payload: TPageFolderCreatePayload): Promise<TPageFolder> => {
    // Validate nesting depth
    if (payload.parent_folder) {
      const parentDepth = this.getFolderDepth(payload.parent_folder);
      if (parentDepth >= MAX_NESTING_DEPTH) {
        throw new Error(`Cannot nest folders deeper than ${MAX_NESTING_DEPTH} levels.`);
      }
    }

    const folder = await this.service.create(workspaceSlug, payload);
    runInAction(() => {
      set(this.folders, folder.id, folder);
    });
    return folder;
  };

  /**
   * Update a folder (rename, change parent, etc.).
   */
  updateFolder = async (
    workspaceSlug: string,
    folderId: string,
    payload: TPageFolderUpdatePayload
  ): Promise<TPageFolder> => {
    // If moving to a new parent, validate depth
    if (payload.parent_folder !== undefined && payload.parent_folder !== null) {
      const parentDepth = this.getFolderDepth(payload.parent_folder);
      if (parentDepth >= MAX_NESTING_DEPTH) {
        throw new Error(`Cannot nest folders deeper than ${MAX_NESTING_DEPTH} levels.`);
      }
    }

    const folder = await this.service.update(workspaceSlug, folderId, payload);
    runInAction(() => {
      set(this.folders, folderId, folder);
    });
    return folder;
  };

  /**
   * Delete a folder. Children are promoted to the parent folder by the backend.
   */
  removeFolder = async (workspaceSlug: string, folderId: string): Promise<void> => {
    const folder = this.folders[folderId];
    if (!folder) return;

    await this.service.remove(workspaceSlug, folderId);
    runInAction(() => {
      // Promote sub-folders to the deleted folder's parent
      for (const f of Object.values(this.folders)) {
        if (f.parent_folder === folderId) {
          f.parent_folder = folder.parent_folder;
        }
      }
      // Promote pages in this folder to the parent folder
      for (const [pageId, mappedFolderId] of Object.entries(this.pageFolderMap)) {
        if (mappedFolderId === folderId) {
          this.pageFolderMap[pageId] = folder.parent_folder;
        }
      }
      unset(this.folders, folderId);
      // Remove from expanded state — immutable replacement
      const { [folderId]: _, ...rest } = this.expandedFolders;
      this.expandedFolders = rest;
      saveExpandedState(rest);
      savePageFolderMap({ ...this.pageFolderMap });
    });
  };

  /**
   * Move a page into a folder (or root if folderId is null).
   */
  movePageToFolder = async (workspaceSlug: string, pageId: string, folderId: string | null): Promise<void> => {
    await this.service.movePageToFolder(workspaceSlug, pageId, folderId);
    runInAction(() => {
      if (folderId === null) {
        delete this.pageFolderMap[pageId];
      } else {
        this.pageFolderMap[pageId] = folderId;
      }
      savePageFolderMap({ ...this.pageFolderMap });
    });
  };

  /**
   * Remove a page from the folder mapping (used after page deletion).
   */
  removePageFromMap = (pageId: string): void => {
    delete this.pageFolderMap[pageId];
    savePageFolderMap({ ...this.pageFolderMap });
  };
}
