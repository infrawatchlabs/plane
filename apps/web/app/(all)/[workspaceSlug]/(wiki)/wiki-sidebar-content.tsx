/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useState } from "react";
import { observer } from "mobx-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Plus, Home, Loader2, Trash2 } from "lucide-react";
import { WikiIcon } from "@plane/propel/icons";
import { ScrollArea } from "@plane/propel/scrollarea";
import { cn } from "@plane/utils";
// components
import { SidebarNavItem } from "@/components/sidebar/sidebar-navigation";
import { AppSidebarToggleButton } from "@/components/sidebar/sidebar-toggle-button";
// store hooks
import { useWorkspaceWikiPages } from "@/hooks/store/use-workspace-wiki-pages";
import { useAppRouter } from "@/hooks/use-app-router";

export const WikiSidebarContent = observer(function WikiSidebarContent() {
  const { workspaceSlug } = useParams();
  const pathname = usePathname();
  const router = useAppRouter();
  const { pagesList, loader, fetchPages, createPage, deletePage } = useWorkspaceWikiPages();
  // states
  const [isCreating, setIsCreating] = useState(false);

  const slug = workspaceSlug?.toString() ?? "";
  const wikiBasePath = `/${slug}/wiki`;
  const isHomePath = pathname === `/${slug}/wiki` || pathname === `/${slug}/wiki/`;

  // Fetch pages on mount
  useEffect(() => {
    if (slug) {
      fetchPages(slug);
    }
  }, [slug, fetchPages]);

  // Handle new page creation
  const handleCreatePage = useCallback(async () => {
    if (!slug || isCreating) return;
    setIsCreating(true);
    try {
      const page = await createPage(slug, {
        name: "Untitled",
      });
      if (page?.id) {
        router.push(`${wikiBasePath}/${page.id}`);
      }
    } catch (error) {
      console.error("Failed to create wiki page:", error);
    } finally {
      setIsCreating(false);
    }
  }, [slug, isCreating, createPage, router, wikiBasePath]);

  // Handle page deletion
  const handleDeletePage = useCallback(
    async (e: React.MouseEvent, pageId: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (!slug) return;
      try {
        await deletePage(slug, pageId);
        // If we're currently viewing the deleted page, navigate to wiki home
        if (pathname === `${wikiBasePath}/${pageId}`) {
          router.push(wikiBasePath);
        }
      } catch (error) {
        console.error("Failed to delete wiki page:", error);
      }
    },
    [slug, deletePage, pathname, wikiBasePath, router]
  );

  const isInitLoading = loader === "init-loader";

  // Helper to get emoji from page logo_props
  const getPageEmoji = (page: (typeof pagesList)[0]): string => {
    if (page.logo_props?.in_use === "emoji" && page.logo_props?.emoji?.value) {
      return page.logo_props.emoji.value;
    }
    return "\uD83D\uDCC4";
  };

  return (
    <div className="flex h-full w-full animate-fade-in flex-col">
      {/* Header */}
      <div className="flex flex-col gap-3 px-3">
        <div className="flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-1.5 pt-1">
            <WikiIcon className="size-4 flex-shrink-0 text-primary" />
            <span className="text-16 font-medium text-primary">Wiki</span>
          </div>
          <div className="flex items-center gap-2">
            <AppSidebarToggleButton />
          </div>
        </div>

        {/* New page button */}
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md border border-subtle px-3 py-2 text-13 font-medium text-secondary hover:bg-layer-transparent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleCreatePage}
          disabled={isCreating}
        >
          {isCreating ? (
            <Loader2 className="size-4 flex-shrink-0 animate-spin" />
          ) : (
            <Plus className="size-4 flex-shrink-0" />
          )}
          <span>{isCreating ? "Creating..." : "New page"}</span>
        </button>
      </div>

      {/* Page list */}
      <ScrollArea
        orientation="vertical"
        scrollType="hover"
        size="sm"
        rootClassName="size-full overflow-x-hidden overflow-y-auto"
        viewportClassName="flex flex-col gap-0.5 overflow-x-hidden h-full w-full overflow-y-auto px-3 pt-3 pb-0.5"
      >
        {/* Home page link */}
        <Link href={wikiBasePath}>
          <SidebarNavItem isActive={isHomePath}>
            <div className="flex items-center gap-1.5 py-[1px]">
              <Home className="size-4 flex-shrink-0" />
              <p className="text-13 leading-5 font-medium">Home</p>
            </div>
          </SidebarNavItem>
        </Link>

        {/* Workspace pages section */}
        <div className="mt-3">
          <div className="px-2 py-1.5">
            <span className="text-13 font-semibold text-placeholder">Workspace</span>
          </div>

          {isInitLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-4 animate-spin text-placeholder" />
            </div>
          ) : pagesList.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {pagesList.map((page) => {
                const pageId = page.id ?? "";
                const pagePath = `${wikiBasePath}/${pageId}`;
                const isActive = pathname === pagePath;
                return (
                  <Link key={pageId} href={pagePath}>
                    <SidebarNavItem isActive={isActive}>
                      <div className="group flex w-full items-center justify-between gap-1 py-[1px]">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="flex size-4 flex-shrink-0 items-center justify-center text-sm">
                            {getPageEmoji(page)}
                          </span>
                          <p className={cn("text-13 leading-5 font-medium truncate")}>
                            {page.name || "Untitled"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="flex-shrink-0 rounded p-0.5 text-secondary opacity-0 hover:bg-layer-transparent-hover hover:text-danger group-hover:opacity-100"
                          onClick={(e) => handleDeletePage(e, pageId)}
                          title="Delete page"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </SidebarNavItem>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="px-2 py-4 text-center text-13 text-placeholder">
              No pages yet. Create your first wiki page.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});
