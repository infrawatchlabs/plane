/**
 * PP-71: Agent Docs — shared layout context.
 *
 * Selection state and a "bump" counter for forcing path-list refetches
 * after writes/deletes. Kept in a context (not MobX) because v1 has
 * exactly two consumers: the sidebar tree and the editor page.
 */

import { createContext, useContext } from "react";

type AgentDocsContextValue = {
  workspaceSlug: string;
  selectedPath: string | null;
  setSelectedPath: (path: string | null) => void;
  listVersion: number;
  bumpListVersion: () => void;
};

export const AgentDocsContext = createContext<AgentDocsContextValue | null>(null);

export function useAgentDocsContext(): AgentDocsContextValue {
  const ctx = useContext(AgentDocsContext);
  if (!ctx) throw new Error("useAgentDocsContext used outside AgentDocsContext provider");
  return ctx;
}
