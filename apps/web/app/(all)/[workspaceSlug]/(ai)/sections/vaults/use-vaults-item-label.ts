/**
 * IW: AI panel — VAULTS breadcrumb item-label hook.
 *
 * Returns the *full workspace-relative path* of the currently-selected
 * vault doc (e.g. `blogs/drafts/ai-org-v2-post.md`), or `null` when no
 * doc is selected. The AI layout's main-pane breadcrumb splits this on
 * "/" and renders every segment so users can see the entire location
 * inline — there's no longer a separate path indicator at the bottom
 * of the editor (one source of truth, see PP polish round 2).
 *
 * Sections without nested paths (future AGENTS, CHATS) can still return
 * a single label and the breadcrumb will render it as one segment —
 * splitting "agent-name" on "/" is a no-op.
 *
 * Lives next to the provider so future sections can own their own
 * equivalent without reaching into VAULTS internals.
 */

import { useVaultsContext } from "./vaults-context";

export function useVaultsItemLabel(): string | null {
  const { selectedPath } = useVaultsContext();
  if (!selectedPath) return null;
  // Normalise: drop a leading slash if some caller ever passes one in,
  // and collapse adjacent slashes so the segment split below stays
  // tight. The API only ever returns relative paths, so this is
  // belt-and-braces for whatever stores it (URL deep links, etc).
  return selectedPath.replace(/^\/+/, "").replace(/\/{2,}/g, "/");
}
