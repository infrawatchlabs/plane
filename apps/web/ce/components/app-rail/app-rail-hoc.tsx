/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// hoc/withDockItems.tsx
import React from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { NotebookText } from "lucide-react";
import { WikiIcon } from "@plane/propel/icons";
import type { AppSidebarItemData } from "@/components/sidebar/sidebar-item";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";

type WithDockItemsProps = {
  dockItems: (AppSidebarItemData & { shouldRender: boolean })[];
};

export function withDockItems<P extends WithDockItemsProps>(WrappedComponent: React.ComponentType<P>) {
  const ComponentWithDockItems = observer(function ComponentWithDockItems(props: Omit<P, keyof WithDockItemsProps>) {
    const { workspaceSlug } = useParams();
    const { isProjectsPath, isWikiPath, isAgentDocsPath, isNotificationsPath } = useWorkspacePaths();

    const dockItems: (AppSidebarItemData & { shouldRender: boolean })[] = [
      {
        label: "Projects",
        icon: <img src="/favicon/iw-icon-32.png" alt="IW" className="size-5" />,
        href: `/${workspaceSlug}/`,
        isActive: isProjectsPath && !isNotificationsPath,
        shouldRender: true,
      },
      {
        label: "Wiki",
        icon: <WikiIcon className="size-5" />,
        href: `/${workspaceSlug}/wiki/`,
        isActive: isWikiPath,
        shouldRender: true,
      },
      {
        // PP-71: Agent Docs — workspace-level markdown notes (replaces local Obsidian vault).
        label: "Agent Docs",
        icon: <NotebookText className="size-5" />,
        href: `/${workspaceSlug}/agent-docs/`,
        isActive: isAgentDocsPath,
        shouldRender: true,
      },
    ];

    return <WrappedComponent {...(props as P)} dockItems={dockItems} />;
  });

  return ComponentWithDockItems;
}
