/**
 * PP-71: Agent Docs — sidebar content (header + tree).
 *
 * Fetches the flat path list, renders the tree, owns the "New doc" button.
 */

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { agentDocsClient, AgentDocStaleError } from "@/services/agent-docs";
import { AgentDocsTree } from "@/components/agent-docs/iw-agent-docs-tree";
import { useAgentDocsContext } from "./agent-docs-context";

export function AgentDocsSidebarContent() {
  const { workspaceSlug, selectedPath, setSelectedPath, listVersion, bumpListVersion } = useAgentDocsContext();
  const [paths, setPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    agentDocsClient
      .list(workspaceSlug)
      .then((res) => {
        if (cancelled) return;
        setPaths(res.docs.map((d) => d.path));
        setError(null);
        return res;
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.detail ?? "Failed to load docs.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceSlug, listVersion]);

  const handleCreate = async () => {
    if (creating) return;
    const input = window.prompt(
      "Path for the new doc (must end with .md, e.g. plans/surya.md):",
      "scratch/untitled.md"
    );
    if (!input) return;
    const trimmed = input.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await agentDocsClient.write(workspaceSlug, trimmed, `# ${trimmed}\n\n`);
      bumpListVersion();
      setSelectedPath(trimmed);
    } catch (err) {
      if (err instanceof AgentDocStaleError) {
        window.alert(`A doc already exists at ${trimmed}. Pick a different path.`);
      } else {
        window.alert((err as { detail?: string })?.detail ?? "Create failed.");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (path: string) => {
    try {
      await agentDocsClient.remove(workspaceSlug, path);
      if (selectedPath === path) setSelectedPath(null);
      bumpListVersion();
    } catch (err) {
      window.alert((err as { detail?: string })?.detail ?? "Delete failed.");
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between border-b border-subtle px-3 py-2">
        <span className="text-13 font-semibold text-primary">Agent Docs</span>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-1 rounded-md border border-subtle px-2 py-1 text-12 text-secondary hover:bg-layer-transparent-hover disabled:cursor-not-allowed disabled:opacity-50"
          title="Create a new agent doc"
        >
          {creating ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
          <span>New</span>
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center gap-2 p-3 text-13 text-tertiary">
            <Loader2 className="size-3.5 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <div className="text-red-500 p-3 text-13">{error}</div>
        ) : (
          <AgentDocsTree paths={paths} selectedPath={selectedPath} onSelect={setSelectedPath} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}
