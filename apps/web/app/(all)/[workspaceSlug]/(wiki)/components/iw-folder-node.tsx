/**
 * PP-3: FolderNode — renders a folder in the wiki sidebar tree.
 * Supports expand/collapse, drag-and-drop (as drop target), context menu, and inline rename.
 */

import { useCallback, useRef, useState } from "react";
import { observer } from "mobx-react";
import { ChevronRight, Folder, FolderOpen, MoreHorizontal } from "lucide-react";
import { cn } from "@plane/utils";
// components
import { SidebarNavItem } from "@/components/sidebar/sidebar-navigation";
// hooks
import { usePageFolders } from "@/hooks/store/use-page-folders";
// local components
import { FolderContextMenu } from "./iw-folder-context-menu";
import { WikiPageNode } from "./iw-page-node";

type Props = {
  folderId: string;
  workspaceSlug: string;
  wikiBasePath: string;
  depth: number;
  onCreatePage: (folderId: string) => void;
  onDragOver: (e: React.DragEvent, folderId: string) => void;
  onDrop: (e: React.DragEvent, folderId: string) => void;
  dragOverFolderId: string | null;
  currentPageId?: string;
  allPagesList: Array<{ id?: string | null; name?: string; logo_props?: Record<string, unknown> }>;
};

const MAX_DEPTH = 4;

export const FolderNode = observer(function FolderNode(props: Props) {
  const {
    folderId,
    workspaceSlug,
    wikiBasePath,
    depth,
    onCreatePage,
    onDragOver,
    onDrop,
    dragOverFolderId,
    currentPageId,
    allPagesList,
  } = props;

  const folderStore = usePageFolders();
  const folder = folderStore.getFolderById(folderId);
  const isExpanded = folderStore.isFolderExpanded(folderId);
  const childFolderIds = folderStore.getChildFolderIds(folderId);
  const pageIdsInFolder = folderStore.getPageIdsInFolder(folderId);

  // States
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Pages in this folder, sorted alphabetically
  const pagesInFolder = allPagesList
    .filter((p) => p.id && pageIdsInFolder.includes(p.id))
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

  if (!folder) return null;

  const isDragOver = dragOverFolderId === folderId;
  const canCreateSubFolder = depth < MAX_DEPTH;
  const indentPx = depth * 16;

  // Handlers
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    folderStore.toggleFolderExpanded(folderId);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({ x: rect.right, y: rect.top });
  };

  const handleStartRename = () => {
    setRenameValue(folder.name);
    setIsRenaming(true);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const handleFinishRename = useCallback(async () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== folder.name) {
      try {
        await folderStore.updateFolder(workspaceSlug, folderId, { name: trimmed });
      } catch (error) {
        console.error("Failed to rename folder:", error);
      }
    }
    setIsRenaming(false);
  }, [renameValue, folder.name, folderStore, workspaceSlug, folderId]);

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleFinishRename();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
    }
  };

  const handleDelete = useCallback(async () => {
    try {
      await folderStore.removeFolder(workspaceSlug, folderId);
    } catch (error) {
      console.error("Failed to delete folder:", error);
    }
  }, [folderStore, workspaceSlug, folderId]);

  const handleNewSubFolder = useCallback(async () => {
    try {
      await folderStore.createFolder(workspaceSlug, {
        name: "New Folder",
        parent_folder: folderId,
      });
      folderStore.setFolderExpanded(folderId, true);
    } catch (error) {
      console.error("Failed to create sub-folder:", error);
    }
  }, [folderStore, workspaceSlug, folderId]);

  const handleNewPage = () => {
    folderStore.setFolderExpanded(folderId, true);
    onCreatePage(folderId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver(e, folderId);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop(e, folderId);
  };

  return (
    <div>
      {/* Folder row */}
      <div
        style={{ paddingLeft: `${indentPx}px` }}
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <SidebarNavItem className={cn(isDragOver && "ring-primary/30 bg-layer-transparent-hover ring-2")}>
          <div className="group flex w-full items-center gap-1 py-[1px]">
            {/* Expand/collapse chevron */}
            <button
              type="button"
              className="flex-shrink-0 rounded p-0.5 hover:bg-layer-transparent-hover"
              onClick={handleToggle}
            >
              <ChevronRight
                className={cn("size-3.5 text-tertiary transition-transform duration-150", isExpanded && "rotate-90")}
              />
            </button>

            {/* Folder icon */}
            <span className="flex size-4 flex-shrink-0 items-center justify-center text-secondary">
              {isExpanded ? <FolderOpen className="size-4" /> : <Folder className="size-4" />}
            </span>

            {/* Folder name or rename input */}
            {isRenaming ? (
              <input
                ref={renameInputRef}
                type="text"
                className="focus:border-primary min-w-0 flex-1 rounded border border-subtle bg-surface-1 px-1 py-0 text-13 leading-5 font-medium text-primary outline-none"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={handleRenameKeyDown}
              />
            ) : (
              <button
                type="button"
                className="min-w-0 flex-1 cursor-pointer truncate border-none bg-transparent p-0 text-left text-13 leading-5 font-medium"
                onClick={handleToggle}
              >
                {folder.name}
              </button>
            )}

            {/* Three-dot menu */}
            <button
              type="button"
              className="flex-shrink-0 rounded p-0.5 text-secondary opacity-0 group-hover:opacity-100 hover:bg-layer-transparent-hover"
              onClick={handleMenuClick}
              title="Folder actions"
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </div>
        </SidebarNavItem>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <FolderContextMenu
          isOpen
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onRename={handleStartRename}
          onDelete={handleDelete}
          onNewSubFolder={handleNewSubFolder}
          onNewPage={handleNewPage}
          canCreateSubFolder={canCreateSubFolder}
        />
      )}

      {/* Children (sub-folders + pages) */}
      {isExpanded && (
        <div>
          {/* Sub-folders */}
          {childFolderIds.map((childId) => (
            <FolderNode
              key={childId}
              folderId={childId}
              workspaceSlug={workspaceSlug}
              wikiBasePath={wikiBasePath}
              depth={depth + 1}
              onCreatePage={onCreatePage}
              onDragOver={onDragOver}
              onDrop={onDrop}
              dragOverFolderId={dragOverFolderId}
              currentPageId={currentPageId}
              allPagesList={allPagesList}
            />
          ))}

          {/* Pages in this folder */}
          {pagesInFolder.map((page) => {
            const pageId = page.id ?? "";
            return (
              <WikiPageNode
                key={pageId}
                pageId={pageId}
                page={page}
                wikiBasePath={wikiBasePath}
                depth={depth + 1}
                isActive={currentPageId === pageId}
              />
            );
          })}

          {/* Empty state */}
          {childFolderIds.length === 0 && pagesInFolder.length === 0 && (
            <div style={{ paddingLeft: `${(depth + 1) * 16}px` }} className="px-2 py-2 text-12 text-placeholder">
              Empty folder
            </div>
          )}
        </div>
      )}
    </div>
  );
});
