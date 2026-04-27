/**
 * IW: AI panel — VAULTS section context (was Agent Docs context in PP-71).
 *
 * Selection state and a "bump" counter for forcing path-list refetches
 * after writes/deletes. Kept in a context (not MobX) because v1 has
 * exactly two consumers: the vaults sidebar tree and the editor page.
 *
 * Same shape as the prior AgentDocsContext — just renamed under the new
 * /ai/vaults namespace. Future sections (AGENTS, CHATS) will define
 * their own context next to their components.
 */

import { createContext, useContext } from "react";

type VaultsContextValue = {
  workspaceSlug: string;
  selectedPath: string | null;
  setSelectedPath: (path: string | null) => void;
  listVersion: number;
  bumpListVersion: () => void;
};

export const VaultsContext = createContext<VaultsContextValue | null>(null);

export function useVaultsContext(): VaultsContextValue {
  const ctx = useContext(VaultsContext);
  if (!ctx) throw new Error("useVaultsContext used outside VaultsContext provider");
  return ctx;
}
