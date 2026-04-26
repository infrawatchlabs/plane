/**
 * PP-71: Agent Docs — in-memory mock client.
 *
 * Lets the frontend ship and be visually verified BEFORE PP-70 backend is
 * merged. Same `IAgentDocsClient` interface as the real service, so swap is
 * a one-line change in `index.ts`.
 *
 * Seeded with a handful of paths that mirror the current Obsidian vault
 * shape so the tree navigator has something realistic to render.
 */

import {
  AgentDocStaleError,
  type IAgentDocsClient,
  type TAgentDoc,
  type TAgentDocListResponse,
} from "./iw-agent-docs.types";

type MockDoc = {
  path: string;
  content: string;
  version: number;
  created_at: string;
  updated_at: string;
};

const SEED_DOCS: MockDoc[] = [
  {
    path: "plans/surya.md",
    content:
      "# Surya — Rolling Plan\n\n## Now\n- PP-71 Agent Docs frontend (this file is rendered via the mock service).\n\n## Next\n- Swap mock → real PP-70 client once Vikrant merges.\n",
    version: 1,
    created_at: "2026-04-26T15:00:00Z",
    updated_at: "2026-04-26T15:00:00Z",
  },
  {
    path: "plans/vikrant.md",
    content:
      "# Vikrant — Rolling Plan\n\n## Now\n- PP-70 Agent Docs backend.\n\n## Mock contract\nSee Surya's response on exchange `84e6879661d6`.\n",
    version: 1,
    created_at: "2026-04-26T15:00:00Z",
    updated_at: "2026-04-26T15:00:00Z",
  },
  {
    path: "specs/plane-agent-docs.md",
    content:
      "# Plane Agent Docs — Spec\n\nReplace the local Obsidian vault with a workspace-level feature in the Plane fork.\n\n## Why\n- Centralization without paying for Obsidian Sync.\n- Single platform — Plane already runs on the mini-PC.\n\n## Why a NEW table\nWe tried Plane Pages and the Yjs/CRDT layer + browser IndexedDB clobbered REST writes. See `specs/plane-live-race-guard.md`.\n",
    version: 3,
    created_at: "2026-04-25T19:00:00Z",
    updated_at: "2026-04-26T20:43:00Z",
  },
  {
    path: "memory/surya/2026-04-26.md",
    content:
      "# Session log — 2026-04-26\n\nKicked off PP-71. Defined mock contract. Built UI scaffold against mock data.\n",
    version: 1,
    created_at: "2026-04-26T15:30:00Z",
    updated_at: "2026-04-26T15:30:00Z",
  },
  {
    path: "learnings/surya/observations.md",
    content: "# Observations — Surya\n\n_Append `/retro` entries here._\n",
    version: 1,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-26T15:00:00Z",
  },
  {
    path: "inbox/surya.md",
    content: "# Inbox — Surya\n\nNo unread emails in the last 3 days.\n",
    version: 1,
    created_at: "2026-04-26T15:00:00Z",
    updated_at: "2026-04-26T15:00:00Z",
  },
  {
    path: "blogs/drafts/launch-post.md",
    content: "# Launch post — draft\n\nTODO: write hook, narrative, CTA.\n",
    version: 1,
    created_at: "2026-04-20T00:00:00Z",
    updated_at: "2026-04-22T00:00:00Z",
  },
  {
    path: "curations/2026-04-25-batch.md",
    content: "# Curation batch — 2026-04-25\n\nClustered observations across Arun, Surya, Vikrant.\n",
    version: 1,
    created_at: "2026-04-25T00:00:00Z",
    updated_at: "2026-04-25T00:00:00Z",
  },
];

export class AgentDocsMockService implements IAgentDocsClient {
  // Per-workspace store. In a real session we only ever see one slug, but
  // keying by slug keeps the mock honest about isolation.
  private store: Map<string, Map<string, MockDoc>> = new Map();

  private bucket(workspaceSlug: string): Map<string, MockDoc> {
    let b = this.store.get(workspaceSlug);
    if (!b) {
      b = new Map();
      for (const d of SEED_DOCS) {
        b.set(d.path, { ...d });
      }
      this.store.set(workspaceSlug, b);
    }
    return b;
  }

  private async simulateLatency(): Promise<void> {
    // Light delay so loading states are visible; don't slow down dev.
    await new Promise((r) => setTimeout(r, 80));
  }

  private toDoc(d: MockDoc): TAgentDoc {
    return {
      path: d.path,
      content: d.content,
      version: d.version,
      created_at: d.created_at,
      updated_at: d.updated_at,
    };
  }

  async list(workspaceSlug: string, prefix?: string): Promise<TAgentDocListResponse> {
    await this.simulateLatency();
    const b = this.bucket(workspaceSlug);
    const summaries = [...b.values()]
      .filter((d) => !prefix || d.path.startsWith(prefix))
      .map((d) => ({ path: d.path, version: d.version, updated_at: d.updated_at }));
    const docs = summaries.toSorted((a, b2) => a.path.localeCompare(b2.path));
    return { docs };
  }

  async retrieve(workspaceSlug: string, path: string): Promise<TAgentDoc> {
    await this.simulateLatency();
    const b = this.bucket(workspaceSlug);
    const d = b.get(path);
    if (!d) {
      throw { detail: `Not found: ${path}` };
    }
    return this.toDoc(d);
  }

  async write(workspaceSlug: string, path: string, content: string, version?: number): Promise<TAgentDoc> {
    await this.simulateLatency();
    const b = this.bucket(workspaceSlug);
    const existing = b.get(path);

    // Path validation — server should enforce, but mock checks too so the UI
    // can be exercised against the same rules.
    if (!path.endsWith(".md")) throw { detail: "path must end with .md" };
    if (path.startsWith("/") || path.includes("..")) throw { detail: "invalid path" };

    if (!existing) {
      // create-only path
      if (typeof version === "number") {
        // can't have a version for a doc that doesn't exist
        throw new AgentDocStaleError("doc does not exist", undefined);
      }
      const now = new Date().toISOString();
      const created: MockDoc = { path, content, version: 1, created_at: now, updated_at: now };
      b.set(path, created);
      return this.toDoc(created);
    }

    // update path — must match version
    if (typeof version !== "number" || version !== existing.version) {
      throw new AgentDocStaleError(`stale version: client=${version}, server=${existing.version}`, existing.version);
    }
    existing.content = content;
    existing.version += 1;
    existing.updated_at = new Date().toISOString();
    return this.toDoc(existing);
  }

  async remove(workspaceSlug: string, path: string): Promise<void> {
    await this.simulateLatency();
    const b = this.bucket(workspaceSlug);
    if (!b.has(path)) {
      throw { detail: `Not found: ${path}` };
    }
    b.delete(path);
  }
}
