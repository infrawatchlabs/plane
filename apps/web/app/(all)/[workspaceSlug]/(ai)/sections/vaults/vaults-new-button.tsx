/**
 * IW: AI panel — VAULTS section header action ("+ New").
 *
 * Round 2 polish: this used to live as a separate row under the VAULTS
 * uppercase header. Collapsed onto the header row to reclaim vertical
 * space — the layout now renders the section descriptor's
 * `HeaderAction` to the right of the label with `justify-between`.
 *
 * Lives next to the provider so future sections (AGENTS, CHATS) can
 * register their own header actions via the section descriptor without
 * touching the AI sidebar shell.
 */

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { agentDocsClient, AgentDocStaleError } from "@/services/agent-docs";
import { useVaultsContext } from "./vaults-context";

export function VaultsNewButton() {
  const { workspaceSlug, setSelectedPath, bumpListVersion } = useVaultsContext();
  const [creating, setCreating] = useState(false);

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

  return (
    <button
      type="button"
      onClick={handleCreate}
      disabled={creating}
      // Compact button styling — sits inside the section header row
      // alongside the uppercase label. Same affordance as the previous
      // standalone row, just denser. The icon-only variant on hover
      // matches the per-folder "+" so the two creation entry points
      // feel consistent.
      className="flex flex-shrink-0 items-center gap-1 rounded-md border border-subtle px-1.5 py-0.5 text-11 text-secondary hover:bg-layer-transparent-hover disabled:cursor-not-allowed disabled:opacity-50"
      title="Create a new vault doc"
    >
      {creating ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
      <span>New</span>
    </button>
  );
}
