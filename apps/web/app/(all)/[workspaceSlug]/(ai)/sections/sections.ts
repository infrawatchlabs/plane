/**
 * IW: AI panel — section registry.
 *
 * Each AI panel section (VAULTS, future AGENTS, future CHATS, ...) is a
 * group with its own URL slug under `/ai/<slug>` and its own sidebar
 * block. Sections live as siblings under the AI rail, mirroring how
 * Plane's Projects sidebar groups (Workspace / Projects) sit alongside
 * each other.
 *
 * Adding a new section:
 *   1. Drop a `sections/<slug>/` folder with `<slug>-sidebar-content.tsx`,
 *      `<slug>-provider.tsx` (if it owns shared state), and `page.tsx`.
 *   2. Append a descriptor below.
 *   3. Wire one extra `route(...)` in `app/routes/core.ts`.
 *
 * The first descriptor is the default section the bare `/ai` URL lands
 * on — keep VAULTS first while it's the only one populated.
 */
import type { ComponentType, ReactNode } from "react";
import { VaultsProvider } from "./vaults/vaults-provider";
import { VaultsSidebarContent } from "./vaults/vaults-sidebar-content";

export type TAISectionId = "vaults";

export type TAISectionDescriptor = {
  /** Stable section identifier — used in URLs and as a React key. */
  id: TAISectionId;
  /** URL slug under `/ai/<slug>`. Plain ASCII, no slashes. */
  slug: string;
  /** Header label shown in the AI panel sidebar (UPPERCASE plural). */
  label: string;
  /**
   * Sidebar block component for this section. Renders under the section
   * header — owns its own data fetching and selection UI.
   */
  SidebarContent: ComponentType;
  /**
   * Optional provider that wraps the whole AI layout so both the
   * section's sidebar block and its main pane share state. Layout
   * stacks these in registration order.
   */
  Provider?: ComponentType<{ children: ReactNode }>;
};

export const AI_SECTIONS: TAISectionDescriptor[] = [
  {
    id: "vaults",
    slug: "vaults",
    label: "VAULTS",
    SidebarContent: VaultsSidebarContent,
    Provider: VaultsProvider,
  },
];

/** Default landing section when the user hits bare `/ai`. */
export const DEFAULT_AI_SECTION = AI_SECTIONS[0];
