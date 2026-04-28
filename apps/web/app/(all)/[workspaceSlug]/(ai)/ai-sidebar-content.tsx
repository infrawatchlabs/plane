/**
 * IW: AI panel — sidebar shell.
 *
 * Renders the "AI" header at the top, then iterates the section
 * registry to draw an uppercase section header (e.g. "VAULTS")
 * followed by that section's sidebar component. Mirrors the grouping
 * pattern in Plane's Projects sidebar: header → group label →
 * group items → next group.
 *
 * Sections that don't match the active route still render in the
 * sidebar (the user can click their items to navigate cross-section).
 * Active state on individual items is the section's own concern.
 */

import { Sparkles } from "lucide-react";
import { AppSidebarToggleButton } from "@/components/sidebar/sidebar-toggle-button";
import { AI_SECTIONS } from "./sections/sections";

export function AISidebarContent() {
  return (
    <div className="flex h-full w-full animate-fade-in flex-col">
      {/* Top header — mirrors WikiSidebarContent's header alignment so
          the eye sees the AI rail and the Wiki rail as siblings. */}
      <div className="flex flex-col gap-2 px-3">
        <div className="flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-1.5 pt-1">
            <Sparkles className="size-4 flex-shrink-0 text-primary" />
            <span className="text-16 font-medium text-primary">AI</span>
          </div>
          <div className="flex items-center gap-1">
            <AppSidebarToggleButton />
          </div>
        </div>
      </div>

      {/* Section blocks. Today only VAULTS is populated; AGENTS, CHATS
          land here as siblings later by appending to AI_SECTIONS. */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto pt-3">
        {AI_SECTIONS.map((section, idx) => (
          <div
            key={section.id}
            className={idx > 0 ? "mt-3 border-t border-subtle pt-3" : undefined}
            data-ai-section={section.id}
          >
            {/* Uppercase section header — matches Wiki's "Workspace"
                group header weight/colour but stays uppercase + tracks
                wider so VAULTS / AGENTS / CHATS read as section
                dividers, not items. The section icon sits muted to the
                left so the eye can grab the row at a glance without
                competing with the type.

                Round 2 polish: section.HeaderAction (e.g. VAULTS' "+
                New" button) renders on the right via justify-between so
                creation lives on the header row instead of a second
                row below it. Saves vertical space in the sidebar and
                matches what most file-browser sidebars do. */}
            <div className="flex items-center justify-between gap-1.5 px-5 pb-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <section.icon className="size-3 flex-shrink-0 text-placeholder" />
                <span className="tracking-wider truncate text-11 font-semibold text-placeholder uppercase">
                  {section.label}
                </span>
              </div>
              {section.HeaderAction && <section.HeaderAction />}
            </div>
            <section.SidebarContent />
          </div>
        ))}
      </div>
    </div>
  );
}
