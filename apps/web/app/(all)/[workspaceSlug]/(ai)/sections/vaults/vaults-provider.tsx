/**
 * IW: AI panel — VAULTS context provider.
 *
 * Owns selection state + list-version counter for the VAULTS section.
 * Lives at layout level so the section sidebar (tree) and the main
 * pane (editor) share the same selected path without prop drilling.
 *
 * Deep-link behavior: `/ai/vaults?path=<path>` seeds `selectedPath` on
 * mount; subsequent in-app selection mutates state but doesn't push to
 * the URL (paths can contain `/`, so a query string is the only safe
 * encoding — and we don't want every click to dirty browser history).
 * Existing PP-71 callers that opened `/agent-docs/?path=...` continue
 * to work via the legacy redirect that preserves the query string.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router";
import { VaultsContext } from "./vaults-context";

export function VaultsProvider({ children }: { children: ReactNode }) {
  const { workspaceSlug } = useParams();
  const slug = workspaceSlug?.toString() ?? "";
  const [searchParams] = useSearchParams();

  const initialPath = searchParams.get("path");
  const [selectedPath, setSelectedPath] = useState<string | null>(initialPath);
  // bumped after every successful save / create / delete so the page can
  // refetch the path list without prop-drilling a callback.
  const [version, setVersion] = useState(0);

  // Re-sync if the user navigates to a different ?path= via deep link
  // (e.g. opening /ai/vaults?path=foo.md from another window). We only
  // sync when it's a real change to avoid clobbering local selection.
  useEffect(() => {
    const next = searchParams.get("path");
    if (next && next !== selectedPath) setSelectedPath(next);
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
    [slug, selectedPath, version]
  );

  return <VaultsContext.Provider value={value}>{children}</VaultsContext.Provider>;
}
