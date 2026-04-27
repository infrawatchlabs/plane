/**
 * IW: AI panel — VAULTS context provider.
 *
 * Owns selection state + list-version counter for the VAULTS section.
 * Lives at layout level so the section sidebar (tree) and the main
 * pane (editor) share the same selected path without prop drilling.
 *
 * Deep-link behavior: `/ai/vaults?path=<path>` seeds `selectedPath` on
 * mount, AND every in-app selection mirrors back to `?path=` via
 * `setSearchParams({ path }, { replace: true })`. We use `replace`
 * (not `push`) so clicking through the tree doesn't pile entries onto
 * the browser history stack — the URL just reflects the current view
 * the way a deep link would. That makes refresh restore the same doc
 * and copy-paste of the URL behave intuitively.
 *
 * Why state + URL instead of URL-only: the editor reads `selectedPath`
 * many times per render (load, save, dirty state). Wiring everything
 * directly to `searchParams` would re-render the whole subtree on
 * every keystroke through React Router's internal subscriber. Local
 * state stays cheap; the URL effect is one-shot per selection.
 *
 * Existing PP-71 callers that opened `/agent-docs/?path=...` continue
 * to work via the legacy redirect that preserves the query string.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router";
import { VaultsContext } from "./vaults-context";

export function VaultsProvider({ children }: { children: ReactNode }) {
  const { workspaceSlug } = useParams();
  const slug = workspaceSlug?.toString() ?? "";
  const [searchParams, setSearchParams] = useSearchParams();

  const initialPath = searchParams.get("path");
  const [selectedPath, setSelectedPathState] = useState<string | null>(initialPath);
  // bumped after every successful save / create / delete so the page can
  // refetch the path list without prop-drilling a callback.
  const [version, setVersion] = useState(0);

  // Wrap setSelectedPath so every in-app selection mirrors back to the
  // URL via `?path=`. `replace: true` means we don't dirty browser
  // history while the user navigates the tree — refresh / copy-link
  // still work because the URL stays in sync with the current view.
  // The companion useEffect below handles the reverse direction
  // (URL → state) for cross-window deep links.
  const setSelectedPath = useCallback(
    (path: string | null) => {
      setSelectedPathState(path);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (path) next.set("path", path);
          else next.delete("path");
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Re-sync if the user navigates to a different ?path= via deep link
  // (e.g. opening /ai/vaults?path=foo.md from another window). We only
  // sync when it's a real change to avoid clobbering local selection.
  useEffect(() => {
    const next = searchParams.get("path");
    if (next && next !== selectedPath) setSelectedPathState(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const value = useMemo(
    () => ({
      workspaceSlug: slug,
      selectedPath,
      setSelectedPath,
      listVersion: version,
      bumpListVersion: () => setVersion((v) => v + 1),
    }),
    [slug, selectedPath, setSelectedPath, version]
  );

  return <VaultsContext.Provider value={value}>{children}</VaultsContext.Provider>;
}
