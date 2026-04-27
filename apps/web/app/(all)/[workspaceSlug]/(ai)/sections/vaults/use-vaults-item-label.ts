/**
 * IW: AI panel — VAULTS breadcrumb item-label hook.
 *
 * Returns the filename of the currently-selected vault doc (e.g.
 * `plane-ai-module-vision.md` for `specs/plane-ai-module-vision.md`),
 * or `null` when no doc is selected. The AI layout's main-pane header
 * calls this through the section descriptor to render the trailing
 * segment of the breadcrumb.
 *
 * Lives next to the provider so future sections (AGENTS, CHATS) can
 * own their own equivalent without reaching into VAULTS internals.
 */

import { useVaultsContext } from "./vaults-context";

export function useVaultsItemLabel(): string | null {
  const { selectedPath } = useVaultsContext();
  if (!selectedPath) return null;
  // Path is workspace-relative and may contain slashes ("specs/foo.md").
  // The breadcrumb shows just the leaf — the section label already
  // tells the user they're inside VAULTS.
  const leaf = selectedPath.split("/").pop();
  return leaf && leaf.length > 0 ? leaf : selectedPath;
}
