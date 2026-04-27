/**
 * PP-71: Build a folder tree from a flat list of paths by splitting on "/".
 *
 * Input:  ["plans/surya.md", "plans/vikrant.md", "specs/foo.md"]
 * Output: [
 *   { name: "plans", type: "folder", children: [
 *     { name: "surya.md", type: "file", path: "plans/surya.md" },
 *     { name: "vikrant.md", type: "file", path: "plans/vikrant.md" },
 *   ]},
 *   { name: "specs", type: "folder", children: [
 *     { name: "foo.md", type: "file", path: "specs/foo.md" },
 *   ]},
 * ]
 *
 * Folders are sorted alphabetically, files alphabetically within folders.
 * Folders sort before files at the same depth.
 */

import type { TAgentDocTreeNode } from "@/services/agent-docs";

type MutableNode = TAgentDocTreeNode & { children: MutableNode[] };

// Folders before files; alphabetical within a kind. Recursive.
function sortNode(node: MutableNode): void {
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const c of node.children) sortNode(c);
}

export function buildAgentDocTree(paths: string[]): TAgentDocTreeNode[] {
  const root: MutableNode = { name: "", path: "", type: "folder", children: [] };

  for (const fullPath of paths) {
    if (!fullPath) continue;
    const segments = fullPath.split("/").filter(Boolean);
    if (segments.length === 0) continue;

    let cursor: MutableNode = root;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isLeaf = i === segments.length - 1;
      const segPath = segments.slice(0, i + 1).join("/");

      let next = cursor.children.find((c) => c.name === seg && c.type === (isLeaf ? "file" : "folder"));
      if (!next) {
        next = {
          name: seg,
          path: isLeaf ? fullPath : segPath,
          type: isLeaf ? "file" : "folder",
          children: [],
        };
        cursor.children.push(next);
      }
      cursor = next;
    }
  }

  sortNode(root);
  return root.children;
}
