/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback } from "react";
import { LayoutPanelLeft, PanelLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslation } from "@plane/i18n";
import { LinkIcon, SearchIcon } from "@plane/propel/icons";
// plane imports
import { setToast, TOAST_TYPE } from "@plane/propel/toast";
import { copyTextToClipboard } from "@plane/utils";
// components
import type { TPowerKCommandConfig } from "@/components/power-k/core/types";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { usePowerK } from "@/hooks/store/use-power-k";
import { useAppRailPreferences } from "@/hooks/use-navigation-preferences";
// lib
import { useAppRailVisibility } from "@/lib/app-rail";

// Aliases so users can find the side rail commands by typing "app rail",
// "sidebar", etc. — the visible label uses "Side Rail" per MGupta's preference.
const APP_RAIL_KEYWORDS = ["side rail", "app rail", "sidebar", "navigation rail"];

export const usePowerKMiscellaneousCommands = (): TPowerKCommandConfig[] => {
  // store hooks
  const { toggleSidebar } = useAppTheme();
  const { topNavInputRef, topNavSearchInputRef } = usePowerK();
  // app rail preferences
  const { updateDisplayMode } = useAppRailPreferences();
  const { isCollapsed, toggleAppRail } = useAppRailVisibility();
  // translation
  const { t } = useTranslation();

  const copyCurrentPageUrlToClipboard = useCallback(() => {
    const url = new URL(window.location.href);
    copyTextToClipboard(url.href)
      .then(() => {
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: t("power_k.miscellaneous_actions.copy_current_page_url_toast_success"),
        });
        return;
      })
      .catch(() => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: t("power_k.miscellaneous_actions.copy_current_page_url_toast_error"),
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusTopNavSearch = useCallback(() => {
    // Focus PowerK input if available, otherwise focus regular search input
    if (topNavSearchInputRef?.current) {
      topNavSearchInputRef.current.focus();
    } else if (topNavInputRef?.current) {
      topNavInputRef.current.focus();
    }
  }, [topNavInputRef, topNavSearchInputRef]);

  return [
    {
      id: "toggle_app_sidebar",
      group: "miscellaneous",
      type: "action",
      i18n_title: "power_k.miscellaneous_actions.toggle_app_sidebar",
      icon: PanelLeft,
      action: () => toggleSidebar(),
      modifierShortcut: "cmd+b",
      isEnabled: () => true,
      isVisible: () => true,
      closeOnSelect: true,
    },
    {
      id: "side_rail_icon_only",
      group: "miscellaneous",
      type: "action",
      i18n_title: "power_k.miscellaneous_actions.side_rail_icon_only",
      icon: LayoutPanelLeft,
      keywords: APP_RAIL_KEYWORDS,
      action: () => updateDisplayMode("icon_only"),
      isEnabled: () => true,
      isVisible: () => true,
      closeOnSelect: true,
    },
    {
      id: "side_rail_icon_with_label",
      group: "miscellaneous",
      type: "action",
      i18n_title: "power_k.miscellaneous_actions.side_rail_icon_with_label",
      icon: PanelLeft,
      keywords: APP_RAIL_KEYWORDS,
      action: () => updateDisplayMode("icon_with_label"),
      isEnabled: () => true,
      isVisible: () => true,
      closeOnSelect: true,
    },
    {
      id: "side_rail_toggle_visibility",
      group: "miscellaneous",
      type: "action",
      i18n_title: isCollapsed
        ? "power_k.miscellaneous_actions.side_rail_show"
        : "power_k.miscellaneous_actions.side_rail_hide",
      icon: isCollapsed ? PanelLeftOpen : PanelLeftClose,
      keywords: [...APP_RAIL_KEYWORDS, "show", "hide", "dock", "undock"],
      action: () => toggleAppRail(),
      isEnabled: () => true,
      isVisible: () => true,
      closeOnSelect: true,
    },
    {
      id: "copy_current_page_url",
      group: "miscellaneous",
      type: "action",
      i18n_title: "power_k.miscellaneous_actions.copy_current_page_url",
      icon: LinkIcon,
      action: copyCurrentPageUrlToClipboard,
      modifierShortcut: "cmd+shift+c",
      isEnabled: () => true,
      isVisible: () => true,
      closeOnSelect: true,
    },
    {
      id: "focus_top_nav_search",
      group: "miscellaneous",
      type: "action",
      i18n_title: "power_k.miscellaneous_actions.focus_top_nav_search",
      icon: SearchIcon,
      action: focusTopNavSearch,
      modifierShortcut: "cmd+f",
      isEnabled: () => true,
      isVisible: () => true,
      closeOnSelect: true,
    },
  ];
};
