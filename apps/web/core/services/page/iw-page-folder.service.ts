/**
 * PP-3: PageFolder service — mock layer for folder CRUD.
 * When the backend (Vikrant) ships the API, swap the mock implementations
 * for real HTTP calls to /api/workspaces/{slug}/page-folders/.
 */

import { v4 as uuidv4 } from "uuid";
import type {
  TPageFolder,
  TPageFolderCreatePayload,
  TPageFolderUpdatePayload,
} from "@/store/wiki/iw-page-folder.types";

// In-memory mock storage — persisted via localStorage for dev convenience
const STORAGE_KEY = "iw_page_folders_mock";

function loadMockData(): Record<string, TPageFolder> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMockData(data: Record<string, TPageFolder>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // silently ignore
  }
}

export class PageFolderService {
  /**
   * Fetch all folders for a workspace.
   * TODO: Replace with GET /api/workspaces/{slug}/page-folders/
   */
  async fetchAll(_workspaceSlug: string): Promise<TPageFolder[]> {
    const data = loadMockData();
    return Object.values(data);
  }

  /**
   * Fetch a single folder by ID.
   * TODO: Replace with GET /api/workspaces/{slug}/page-folders/{id}/
   */
  async fetchById(_workspaceSlug: string, folderId: string): Promise<TPageFolder> {
    const data = loadMockData();
    const folder = data[folderId];
    if (!folder) throw new Error("Folder not found");
    return folder;
  }

  /**
   * Create a new folder.
   * TODO: Replace with POST /api/workspaces/{slug}/page-folders/
   */
  async create(_workspaceSlug: string, payload: TPageFolderCreatePayload): Promise<TPageFolder> {
    const data = loadMockData();
    const now = new Date().toISOString();
    const folder: TPageFolder = {
      id: uuidv4(),
      name: payload.name,
      description: payload.description ?? "",
      icon: payload.icon ?? "",
      parent_folder: payload.parent_folder ?? null,
      project: null,
      workspace: "",
      created_by: "",
      created_at: now,
      updated_at: now,
    };
    data[folder.id] = folder;
    saveMockData(data);
    return folder;
  }

  /**
   * Update an existing folder.
   * TODO: Replace with PATCH /api/workspaces/{slug}/page-folders/{id}/
   */
  async update(_workspaceSlug: string, folderId: string, payload: TPageFolderUpdatePayload): Promise<TPageFolder> {
    const data = loadMockData();
    const folder = data[folderId];
    if (!folder) throw new Error("Folder not found");
    const updated: TPageFolder = {
      ...folder,
      ...payload,
      updated_at: new Date().toISOString(),
    };
    data[folderId] = updated;
    saveMockData(data);
    return updated;
  }

  /**
   * Delete a folder (promote children to parent).
   * TODO: Replace with DELETE /api/workspaces/{slug}/page-folders/{id}/
   */
  async remove(_workspaceSlug: string, folderId: string): Promise<void> {
    const data = loadMockData();
    const folder = data[folderId];
    if (!folder) throw new Error("Folder not found");

    // Promote sub-folders to the parent of the deleted folder
    for (const f of Object.values(data)) {
      if (f.parent_folder === folderId) {
        f.parent_folder = folder.parent_folder;
      }
    }

    delete data[folderId];
    saveMockData(data);
  }

  /**
   * Move a page into a folder.
   * TODO: Replace with PATCH /api/workspaces/{slug}/pages/{pageId}/ { folder_id }
   */
  async movePageToFolder(_workspaceSlug: string, _pageId: string, _folderId: string | null): Promise<void> {
    // In mock mode, the store handles the mapping locally.
    // When the backend is ready, this will PATCH the page's folder_id.
    return;
  }
}
