/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
// hooks
import { useWorkspaceWikiPages } from "@/hooks/store/use-workspace-wiki-pages";

/**
 * Debounce helper for auto-saving.
 */
function useDebouncedCallback<T extends (...args: never[]) => void>(callback: T, delay: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  return debouncedFn;
}

function WikiPageDetail() {
  const { workspaceSlug, pageId } = useParams();
  const slug = workspaceSlug?.toString() ?? "";
  const id = pageId?.toString() ?? "";

  const { data, fetchPageById, updatePage, loader } = useWorkspaceWikiPages();

  const page = data[id];

  // Local state for editing
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch page on mount
  useEffect(() => {
    if (!slug || !id) return;
    setIsLoading(true);
    setError(null);
    fetchPageById(slug, id)
      .then((fetchedPage) => {
        if (fetchedPage) {
          setTitle(fetchedPage.name ?? "");
          setDescription(fetchedPage.description_html ?? "");
        }
      })
      .catch(() => {
        setError("Failed to load page. Please try again.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [slug, id, fetchPageById]);

  // Sync from store when page data changes externally
  useEffect(() => {
    if (page && !isLoading) {
      // Only sync if we're not currently editing (i.e., on initial load)
      // The title/description sync is handled by the fetch above
    }
  }, [page, isLoading]);

  // Auto-save title
  const debouncedSaveTitle = useDebouncedCallback(
    useCallback(
      async (newTitle: string) => {
        if (!slug || !id) return;
        setIsSaving(true);
        try {
          await updatePage(slug, id, { name: newTitle });
        } catch {
          console.error("Failed to save title");
        } finally {
          setIsSaving(false);
        }
      },
      [slug, id, updatePage]
    ),
    1000
  );

  // Auto-save description
  const debouncedSaveDescription = useDebouncedCallback(
    useCallback(
      async (newDescription: string) => {
        if (!slug || !id) return;
        setIsSaving(true);
        try {
          await updatePage(slug, id, { description_html: newDescription });
        } catch {
          console.error("Failed to save description");
        } finally {
          setIsSaving(false);
        }
      },
      [slug, id, updatePage]
    ),
    1500
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      debouncedSaveTitle(newTitle);
    },
    [debouncedSaveTitle]
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newDescription = e.target.value;
      setDescription(newDescription);
      debouncedSaveDescription(newDescription);
    },
    [debouncedSaveDescription]
  );

  if (isLoading) {
    return (
      <div className="flex size-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-placeholder" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-primary">Error</h2>
          <p className="max-w-md text-sm text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col overflow-hidden">
      {/* Save status indicator */}
      <div className="flex items-center justify-end px-6 py-2">
        <span className="text-xs text-placeholder">
          {isSaving ? "Saving..." : loader === "mutation-loader" ? "Saving..." : "Saved"}
        </span>
      </div>

      {/* Page content */}
      <div className="flex flex-1 flex-col overflow-y-auto px-page-x py-4">
        <div className="mx-auto w-full max-w-3xl">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            className="w-full border-none bg-transparent text-3xl font-bold text-primary outline-none placeholder:text-placeholder"
            autoFocus
          />

          {/* Description editor */}
          <textarea
            value={description}
            onChange={handleDescriptionChange}
            placeholder="Start writing your page content here..."
            className="mt-4 min-h-[400px] w-full flex-1 resize-none border-none bg-transparent text-sm leading-relaxed text-secondary outline-none placeholder:text-placeholder"
          />
        </div>
      </div>
    </div>
  );
}

export default observer(WikiPageDetail);
