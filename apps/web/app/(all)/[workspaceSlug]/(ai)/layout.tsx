/**
 * IW: AI panel — workspace-level layout.
 *
 * Replaces the PP-71 (agent-docs) layout. Same shape — app rail →
 * resizable sidebar → main pane via <Outlet/> — but the sidebar now
 * shows multiple section groups (VAULTS today; AGENTS, CHATS later)
 * instead of a single tree.
 *
 * Each section can register a Provider in `sections/sections.ts`; we
 * stack those providers around the layout so a section's sidebar
 * block and main pane share state without prop drilling. Stacking is
 * cheap (each provider is a thin context) and keeps the layout file
 * agnostic of section internals.
 */

import { useState, type ReactNode } from "react";
import { Outlet } from "react-router";
import { SIDEBAR_WIDTH } from "@plane/constants";
import { useLocalStorage } from "@plane/hooks";
import { ResizableSidebar } from "@/components/sidebar/resizable-sidebar";
import { AppSidebarToggleButton } from "@/components/sidebar/sidebar-toggle-button";
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { AISidebarContent } from "./ai-sidebar-content";
import { AI_SECTIONS } from "./sections/sections";

function AILayoutInner() {
  const { sidebarCollapsed, toggleSidebar, sidebarPeek, toggleSidebarPeek, isAnySidebarDropdownOpen } = useAppTheme();
  const { storedValue, setValue } = useLocalStorage("sidebarWidth", SIDEBAR_WIDTH);
  const [sidebarWidth, setSidebarWidth] = useState<number>(storedValue ?? SIDEBAR_WIDTH);

  return (
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
          <AISidebarContent />
        </ResizableSidebar>
        <main className="relative flex h-full w-full flex-col overflow-hidden bg-surface-1">
          <div className="flex items-center justify-between gap-2 border-b border-subtle px-4 py-2">
            <div className="flex items-center gap-2">
              {sidebarCollapsed && <AppSidebarToggleButton />}
              <span className="text-13 font-medium text-secondary">AI</span>
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AILayout() {
  // Stack each section's Provider around the layout in registration
  // order. Today this is just VaultsProvider; future sections (AGENTS,
  // CHATS) plug in via the same registry without touching this file.
  let tree: ReactNode = <AILayoutInner />;
  for (let i = AI_SECTIONS.length - 1; i >= 0; i--) {
    const section = AI_SECTIONS[i];
    if (section.Provider) {
      const Provider = section.Provider;
      tree = <Provider>{tree}</Provider>;
    }
  }
  return tree;
}

export default AILayout;
