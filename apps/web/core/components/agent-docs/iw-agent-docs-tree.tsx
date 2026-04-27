/**
 * PP-71: Agent Docs — sidebar tree navigator.
 *
 * Receives the flat list of paths, builds a folder tree by splitting on "/",
 * renders a clickable hierarchy. Folders expand/collapse on click. Files are
 * leaves — clicking calls `onSelect(path)`.
 *
 * Intentionally lightweight: no DnD, no rename, no MobX. v1 acceptance is
 * "tree shows the same shape MGupta sees in Obsidian today".
 */

import { useMemo, useState } from "react";
import { ChevronRight, FileText, Folder, FolderOpen, Trash2 } from "lucide-react";
import { cn } from "@plane/utils";
import type { TAgentDocTreeNode } from "@/services/agent-docs";
import { buildAgentDocTree } from "./iw-agent-docs-tree-builder";

type Props = {
  paths: string[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onDelete?: (path: string) => void;
};

export function AgentDocsTree({ paths, selectedPath, onSelect, onDelete }: Props) {
  const tree = useMemo(() => buildAgentDocTree(paths), [paths]);
  // expand the folder containing the selected file by default
  const initialExpanded = useMemo(() => {
    const set = new Set<string>();
    if (selectedPath) {
      const parts = selectedPath.split("/").filter(Boolean);
      parts.pop(); // drop filename
      let acc = "";
      for (const p of parts) {
        acc = acc ? `${acc}/${p}` : p;
        set.add(acc);
      }
    }
    return set;
  }, [selectedPath]);
  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  if (tree.length === 0) {
    return (
      <div className="px-3 py-4 text-13 text-tertiary">
        No docs yet. Click &ldquo;New doc&rdquo; above to create one.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 px-1.5 py-2" data-testid="iw-agent-docs-tree">
      {tree.map((node) => (
        <TreeNode
          key={node.path || node.name}
          node={node}
          depth={0}
          expanded={expanded}
          toggle={toggle}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

type NodeProps = {
  node: TAgentDocTreeNode;
  depth: number;
  expanded: Set<string>;
  toggle: (path: string) => void;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onDelete?: (path: string) => void;
};

function TreeNode({ node, depth, expanded, toggle, selectedPath, onSelect, onDelete }: NodeProps) {
  const indent = { paddingLeft: `${depth * 14 + 8}px` } as const;

  if (node.type === "folder") {
    const isOpen = expanded.has(node.path);
    return (
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => toggle(node.path)}
          className={cn(
            "flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-13 text-secondary hover:bg-layer-transparent-hover"
          )}
          style={indent}
        >
          <ChevronRight className={cn("size-3.5 flex-shrink-0 transition-transform", isOpen && "rotate-90")} />
          {isOpen ? (
            <FolderOpen className="size-3.5 flex-shrink-0 text-tertiary" />
          ) : (
            <Folder className="size-3.5 flex-shrink-0 text-tertiary" />
          )}
          <span className="truncate font-medium">{node.name}</span>
          <span className="ml-auto text-11 text-tertiary">{node.children.length}</span>
        </button>
        {isOpen &&
          node.children.map((child) => (
            <TreeNode
              key={child.path || child.name}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
      </div>
    );
  }

  // file leaf
  const isSelected = selectedPath === node.path;
  return (
    <div
      className={cn(
        "group flex items-center gap-1.5 rounded-md pr-1 text-13 hover:bg-layer-transparent-hover",
        isSelected && "bg-layer-transparent-hover text-primary"
      )}
      style={indent}
    >
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left"
      >
        <span className="size-3.5 flex-shrink-0" /> {/* spacer where chevron would be */}
        <FileText className={cn("size-3.5 flex-shrink-0", isSelected ? "text-primary" : "text-tertiary")} />
        <span className={cn("truncate", isSelected ? "font-medium text-primary" : "text-secondary")}>{node.name}</span>
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Delete ${node.path}?`)) onDelete(node.path);
          }}
          className="invisible flex-shrink-0 rounded p-1 text-tertiary group-hover:visible hover:bg-layer-transparent-hover hover:text-primary"
          title={`Delete ${node.path}`}
        >
          <Trash2 className="size-3" />
        </button>
      )}
    </div>
  );
}
