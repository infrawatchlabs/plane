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
 *
 * Note: this component MUST be wrapped in `observer` because it reads
 * `sidebarCollapsed` from the MobX theme store. The Wiki layout has
 * this; we missed it on the initial AI carve-out and the sidebar
 * collapse toggle silently no-op'd as a result. See the Wiki sidebar
 * for the canonical pattern.
 */

import { useState, type ReactNode } from "react";
import { observer } from "mobx-react";
import { Outlet, useLocation } from "react-router";
import { Sparkles } from "lucide-react";
import { SIDEBAR_WIDTH } from "@plane/constants";
import { useLocalStorage } from "@plane/hooks";
import { ResizableSidebar } from "@/components/sidebar/resizable-sidebar";
import { AppSidebarToggleButton } from "@/components/sidebar/sidebar-toggle-button";
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { AISidebarContent } from "./ai-sidebar-content";
import { AI_SECTIONS, type TAISectionDescriptor } from "./sections/sections";

/**
 * Resolve the active section from the current pathname. The AI panel
 * routes are flat (`/<ws>/ai`, `/<ws>/ai/<slug>`), so a single
 * lastSegment match against `slug` is enough. Returns `null` when on
 * the bare `/ai` index page so the breadcrumb can render the AI root.
 */
function useActiveAISection(): TAISectionDescriptor | null {
  const { pathname } = useLocation();
  // Strip a trailing slash so `/foo/ai/` and `/foo/ai` both behave.
  const trimmed = pathname.replace(/\/+$/, "");
  const last = trimmed.split("/").pop() ?? "";
  if (last === "ai") return null;
  return AI_SECTIONS.find((s) => s.slug === last) ?? null;
}

/**
 * Main-pane breadcrumb: `<icon> <Section> [/ <item>]`.
 * - On `/ai` → `<Sparkles> AI`
 * - On `/ai/<slug>` with no item → `<icon> Vault`
 * - On `/ai/<slug>` with item → `<icon> Vault / plane-ai-module-vision.md`
 *
 * Calling `section.useItemLabel()` unconditionally here is safe because
 * `AILayoutInner` is rendered inside *every* section's Provider stack
 * (see `AILayout` below), so each hook can read its own context. We
 * only render the result for the currently-active section.
 */
const AIMainPaneBreadcrumb = observer(function AIMainPaneBreadcrumb() {
  const activeSection = useActiveAISection();

  // Run *all* sections' useItemLabel hooks in stable order so React's
  // hook-call ordering is deterministic across renders. We then pick
  // the value from the active section. Sections without the hook get
  // `null` and contribute nothing.
  const itemLabels = AI_SECTIONS.map((section) => ({
    id: section.id,
    label: section.useItemLabel ? section.useItemLabel() : null,
  }));
  const itemLabel = activeSection ? (itemLabels.find((entry) => entry.id === activeSection.id)?.label ?? null) : null;

  if (!activeSection) {
    // /ai root — generic AI breadcrumb.
    return (
      <div className="flex min-w-0 items-center gap-1.5">
        <Sparkles className="size-4 flex-shrink-0 text-secondary" />
        <span className="text-13 font-medium text-secondary">AI</span>
      </div>
    );
  }

  const SectionIcon = activeSection.icon;
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <SectionIcon className="size-4 flex-shrink-0 text-secondary" />
      <span className="text-13 font-medium text-secondary">{activeSection.label_singular}</span>
      {itemLabel && (
        <>
          <span className="text-13 text-tertiary">/</span>
          <span className="truncate text-13 font-medium text-primary" title={itemLabel}>
            {itemLabel}
          </span>
        </>
      )}
    </div>
  );
});

const AILayoutInner = observer(function AILayoutInner() {
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
            <div className="flex min-w-0 items-center gap-2">
              {sidebarCollapsed && <AppSidebarToggleButton />}
              <AIMainPaneBreadcrumb />
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
});

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
