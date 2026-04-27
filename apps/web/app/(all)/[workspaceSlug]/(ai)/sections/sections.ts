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
 *   2. Append a descriptor below — pick a Lucide `icon`, supply a
 *      singular form of the label (`label_singular`) for the main-pane
 *      breadcrumb, and (optionally) a `useItemLabel` hook to surface the
 *      currently-selected item's name (e.g. doc filename) in that
 *      breadcrumb.
 *   3. Wire one extra `route(...)` in `app/routes/core.ts`.
 *
 * The first descriptor is the default section the bare `/ai` URL lands
 * on — keep VAULTS first while it's the only one populated.
 */
import type { ComponentType, ReactNode } from "react";
import { FolderOpen, type LucideIcon } from "lucide-react";
import { VaultsProvider } from "./vaults/vaults-provider";
import { VaultsSidebarContent } from "./vaults/vaults-sidebar-content";
import { useVaultsItemLabel } from "./vaults/use-vaults-item-label";

export type TAISectionId = "vaults";

export type TAISectionDescriptor = {
  /** Stable section identifier — used in URLs and as a React key. */
  id: TAISectionId;
  /** URL slug under `/ai/<slug>`. Plain ASCII, no slashes. */
  slug: string;
  /** Header label shown in the AI panel sidebar (UPPERCASE plural). */
  label: string;
  /**
   * Singular form of the label, used in the main-pane breadcrumb
   * (e.g. "Vault" for VAULTS, "Agent" for AGENTS, "Chat" for CHATS).
   * Title case, no trailing punctuation.
   */
  label_singular: string;
  /**
   * Lucide icon component rendered next to the section label in the AI
   * sidebar AND next to the singular label in the main-pane breadcrumb.
   * Pick something that reads as the section's "noun" (folder for
   * vaults, bot for agents, message-square for chats…).
   */
  icon: LucideIcon;
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
  /**
   * Optional hook that returns the breadcrumb's "current item" label
   * (e.g. doc filename for VAULTS, chat title for CHATS) — or `null`
   * when nothing is selected. Called inside the section's Provider so
   * the hook may read the section's context. Keep it cheap; it runs on
   * every layout render of the AI main-pane header.
   */
  useItemLabel?: () => string | null;
};

export const AI_SECTIONS: TAISectionDescriptor[] = [
  {
    id: "vaults",
    slug: "vaults",
    label: "VAULTS",
    label_singular: "Vault",
    // FolderOpen reads as "documents in a vault" without going so
    // literal as a bank-vault glyph — it sits well alongside the
    // Sparkles AI rail icon.
    icon: FolderOpen,
    SidebarContent: VaultsSidebarContent,
    Provider: VaultsProvider,
    useItemLabel: useVaultsItemLabel,
  },
];

/** Default landing section when the user hits bare `/ai`. */
export const DEFAULT_AI_SECTION = AI_SECTIONS[0];
