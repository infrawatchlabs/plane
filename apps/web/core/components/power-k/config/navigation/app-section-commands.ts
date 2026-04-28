/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

/**
 * IW: Power-K command-palette entries for top-level section navigation —
 * "Go to Projects", "Go to Wiki", "Go to AI", "Go to Settings".
 *
 * Sourced from APP_SECTIONS so the 3x3 app-switcher menu and the Cmd+K
 * palette stay in lockstep. Adding a new top-level section = one line
 * in app-sections.tsx, no edits required here.
 */

// constants
import { APP_SECTIONS } from "@/constants/app-sections";
// components
import type { TPowerKCommandConfig, TPowerKContext } from "@/components/power-k/core/types";
import { handlePowerKNavigate } from "@/components/power-k/utils/navigation";

const baseWorkspaceConditions = (ctx: TPowerKContext) => Boolean(ctx.params.workspaceSlug?.toString());

export const usePowerKAppSectionCommands = (): TPowerKCommandConfig[] =>
  APP_SECTIONS.map<TPowerKCommandConfig>((section) => ({
    id: `nav_app_${section.id}`,
    type: "action",
    group: "navigation",
    // i18n keys live in iw.power_k.nav_app_*. The translations file maps
    // these to "Go to Projects", "Go to Wiki", etc.
    i18n_title: `iw.power_k.nav_app_${section.id}`,
    icon: section.icon,
    keywords: [section.id, section.label, `go to ${section.label.toLowerCase()}`],
    action: (ctx) => {
      const slug = ctx.params.workspaceSlug?.toString();
      if (!slug) return;
      // Strip trailing slash — handlePowerKNavigate joins segments itself.
      const href = section.hrefBuilder(slug).replace(/\/$/, "");
      const segments = href.split("/").filter(Boolean);
      handlePowerKNavigate(ctx, segments);
    },
    isEnabled: (ctx) => baseWorkspaceConditions(ctx),
    isVisible: (ctx) => baseWorkspaceConditions(ctx),
    closeOnSelect: true,
  }));
