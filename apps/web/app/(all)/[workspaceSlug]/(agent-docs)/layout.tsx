/**
 * PP-71: Agent Docs — workspace-level layout.
 *
 * Mirrors the Wiki layout shape: app rail → resizable sidebar with the
 * doc tree → main pane via <Outlet/>. Single page (no detail route v1)
 * because doc selection is state inside the page component, not a URL
 * segment. Paths can contain "/" which makes URL routing painful — we
 * keep the path in component state instead.
 */

import { useMemo, useState } from "react";
import { Outlet, useParams } from "react-router";
import { SIDEBAR_WIDTH } from "@plane/constants";
import { useLocalStorage } from "@plane/hooks";
import { ResizableSidebar } from "@/components/sidebar/resizable-sidebar";
import { AppSidebarToggleButton } from "@/components/sidebar/sidebar-toggle-button";
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { AgentDocsSidebarContent } from "./agent-docs-sidebar-content";
import { AgentDocsContext } from "./agent-docs-context";

function AgentDocsLayout() {
  const { workspaceSlug } = useParams();
  const slug = workspaceSlug?.toString() ?? "";
  const { sidebarCollapsed, toggleSidebar, sidebarPeek, toggleSidebarPeek, isAnySidebarDropdownOpen } = useAppTheme();
  const { storedValue, setValue } = useLocalStorage("sidebarWidth", SIDEBAR_WIDTH);
  const [sidebarWidth, setSidebarWidth] = useState<number>(storedValue ?? SIDEBAR_WIDTH);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  // bumped after every successful save / create / delete so the page can
  // refetch the path list without prop-drilling a callback.
  const [version, setVersion] = useState(0);

  // memoized so AgentDocsContext consumers don't re-render every layout pass
  const ctxValue = useMemo(
    () => ({
      workspaceSlug: slug,
      selectedPath,
      setSelectedPath,
      listVersion: version,
      bumpListVersion: () => setVersion((v) => v + 1),
    }),
    [slug, selectedPath, version]
  );

  return (
    <AgentDocsContext.Provider value={ctxValue}>
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-subtle">
        <div className="relative flex size-full overflow-hidden">
          <ResizableSidebar
            showPeek={sidebarPeek}
            defaultWidth={storedValue ?? 250}
            width={sidebarWidth}
            setWidth={setSidebarWidth}
            defaultCollapsed={sidebarCollapsed}
            peekDuration={1500}
            onWidthChange={(w: number) => setValue(w)}
            onCollapsedChange={toggleSidebar}
            isCollapsed={sidebarCollapsed}
            toggleCollapsed={toggleSidebar}
            togglePeek={toggleSidebarPeek}
            isAnySidebarDropdownOpen={isAnySidebarDropdownOpen}
          >
            <AgentDocsSidebarContent />
          </ResizableSidebar>
          <main className="relative flex h-full w-full flex-col overflow-hidden bg-surface-1">
            <div className="flex items-center justify-between gap-2 border-b border-subtle px-4 py-2">
              <div className="flex items-center gap-2">
                {sidebarCollapsed && <AppSidebarToggleButton />}
                <span className="text-13 font-medium text-secondary">Agent Docs</span>
                {selectedPath && (
                  <>
                    <span className="text-tertiary">/</span>
                    <span className="font-code text-12 text-tertiary">{selectedPath}</span>
                  </>
                )}
              </div>
            </div>
            <Outlet />
          </main>
        </div>
      </div>
    </AgentDocsContext.Provider>
  );
}

export default AgentDocsLayout;
