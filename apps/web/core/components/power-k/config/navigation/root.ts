/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// components
import type { TPowerKCommandConfig } from "@/components/power-k/core/types";
// local imports
import { usePowerKAppSectionCommands } from "./app-section-commands";
import type { TPowerKNavigationCommandKeys } from "./commands";
import { usePowerKNavigationCommandsRecord } from "./commands";

export const usePowerKNavigationCommands = (): TPowerKCommandConfig[] => {
  const optionsList: Record<TPowerKNavigationCommandKeys, TPowerKCommandConfig> = usePowerKNavigationCommandsRecord();
  // IW: top-level section nav — "Go to Projects/Wiki/AI/Settings".
  // Sourced from the same APP_SECTIONS registry the 3x3 app-switcher uses.
  const appSectionCommands = usePowerKAppSectionCommands();

  return [
    // IW: top-level app-section nav surfaces first — these are the highest-
    // frequency navigation actions and should rank above project/workspace.
    ...appSectionCommands,
    // Open actions from lowest to highest scope
    optionsList["open_project_cycle"],
    optionsList["open_project_module"],
    optionsList["open_project_view"],
    optionsList["open_project_setting"],
    optionsList["open_project"],
    optionsList["open_workspace_setting"],
    optionsList["open_workspace"],
    // User-Level Navigation
    optionsList["nav_home"],
    optionsList["nav_inbox"],
    optionsList["nav_your_work"],
    // Project-Level Navigation (Only visible in project context)
    optionsList["nav_project_work_items"],
    optionsList["nav_project_pages"],
    optionsList["nav_project_cycles"],
    optionsList["nav_project_modules"],
    optionsList["nav_project_views"],
    optionsList["nav_project_intake"],
    optionsList["nav_project_settings"],
    optionsList["nav_project_archives"],
    // Navigate to workspace-level pages
    optionsList["nav_all_workspace_work_items"],
    optionsList["nav_assigned_workspace_work_items"],
    optionsList["nav_created_workspace_work_items"],
    optionsList["nav_subscribed_workspace_work_items"],
    optionsList["nav_workspace_analytics"],
    optionsList["nav_workspace_settings"],
    optionsList["nav_workspace_drafts"],
    optionsList["nav_workspace_archives"],
    optionsList["nav_projects_list"],
    // Account-Level Navigation
    optionsList["nav_account_settings"],
  ];
};
