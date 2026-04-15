/**
 * PP-3: Breadcrumb navigation for wiki folders.
 * Shows: Wiki > FolderA > SubFolder > PageName
 */

import { observer } from "mobx-react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { WikiIcon } from "@plane/propel/icons";
// hooks
import { usePageFolders } from "@/hooks/store/use-page-folders";

type Props = {
  workspaceSlug: string;
  pageId?: string;
  pageName?: string;
};

export const FolderBreadcrumb = observer(function FolderBreadcrumb(props: Props) {
  const { workspaceSlug, pageId, pageName } = props;
  const folderStore = usePageFolders();

  const wikiBasePath = `/${workspaceSlug}/wiki`;
  const folderId = pageId ? folderStore.getPageFolderId(pageId) : null;
  const folderPath = folderStore.getFolderPath(folderId);

  // If no folder path and no page, just show Wiki
  if (folderPath.length === 0 && !pageName) return null;
  // If no folder path, just show Wiki > Page (no breadcrumb needed since it is at root)
  if (folderPath.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 px-4 py-2 text-13 text-secondary" aria-label="Breadcrumb">
      {/* Wiki home */}
      <Link href={wikiBasePath} className="flex items-center gap-1 transition-colors hover:text-primary">
        <WikiIcon className="size-3.5" />
        <span>Wiki</span>
      </Link>

      {/* Folder path */}
      {folderPath.map((folder) => (
        <span key={folder.id} className="flex items-center gap-1">
          <ChevronRight className="size-3 text-tertiary" />
          <button
            type="button"
            className="transition-colors hover:text-primary"
            onClick={() => {
              // Expand the folder in sidebar and navigate to wiki home
              folderStore.setFolderExpanded(folder.id, true);
            }}
          >
            {folder.name}
          </button>
        </span>
      ))}

      {/* Current page */}
      {pageName && (
        <span className="flex items-center gap-1">
          <ChevronRight className="size-3 text-tertiary" />
          <span className="max-w-[200px] truncate font-medium text-primary">{pageName}</span>
        </span>
      )}
    </nav>
  );
});
