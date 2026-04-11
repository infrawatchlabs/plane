/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Plus, Home } from "lucide-react";
import { WikiIcon } from "@plane/propel/icons";
import { ScrollArea } from "@plane/propel/scrollarea";
import { cn } from "@plane/utils";
// components
import { SidebarNavItem } from "@/components/sidebar/sidebar-navigation";
import { AppSidebarToggleButton } from "@/components/sidebar/sidebar-toggle-button";
// store hooks
import { useWorkspaceWikiPages } from "@/hooks/store/use-workspace-wiki-pages";

export const WikiSidebarContent = observer(function WikiSidebarContent() {
  const { workspaceSlug } = useParams();
  const pathname = usePathname();
  const { pages } = useWorkspaceWikiPages();

  const slug = workspaceSlug?.toString() ?? "";
  const wikiBasePath = `/${slug}/wiki`;
  const isHomePath = pathname === `/${slug}/wiki` || pathname === `/${slug}/wiki/`;

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
          className="flex w-full items-center gap-2 rounded-md border border-subtle px-3 py-2 text-13 font-medium text-secondary hover:bg-layer-transparent-hover"
          onClick={() => {
            // TODO: Create new wiki page — will be wired when PP-9 API is ready
          }}
        >
          <Plus className="size-4 flex-shrink-0" />
          <span>New page</span>
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

          {pages.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {pages.map((page) => {
                const pagePath = `${wikiBasePath}/${page.id}`;
                const isActive = pathname === pagePath;
                return (
                  <Link key={page.id} href={pagePath}>
                    <SidebarNavItem isActive={isActive}>
                      <div className="flex items-center gap-1.5 py-[1px]">
                        <span className="flex size-4 flex-shrink-0 items-center justify-center text-sm">
                          {page.emoji ?? "📄"}
                        </span>
                        <p className={cn("text-13 leading-5 font-medium truncate")}>{page.title || "Untitled"}</p>
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
