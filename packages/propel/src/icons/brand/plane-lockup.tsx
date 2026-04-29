/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import * as React from "react";

import type { ISvgIcons } from "../type";

/**
 * Natural aspect ratio of the Plane Plus horizontal lockup.
 * Source: /public/images/planeplus-horizontal-{light,dark}.svg → viewBox 0 0 845 298.6.
 */
const LOCKUP_RATIO = 845.0 / 298.6; // ≈ 2.83

/**
 * Plane Plus horizontal lockup.
 *
 * Two-color artwork (cream + gold on dark, navy + gold on light), so we cannot
 * tint with currentColor like the upstream Plane wordmark — we ship a pair of
 * SVGs and swap them via Tailwind's `dark:` utility. This avoids needing a
 * `useTheme()` hook in propel (which would force a runtime theme dependency)
 * and avoids the hydration flicker that comes with reading the theme on the
 * client.
 *
 * Asset naming: the SVG name describes the LOCKUP color, not the page theme.
 *   - planeplus-horizontal-dark.svg  (navy + gold) → for LIGHT page bg
 *   - planeplus-horizontal-light.svg (cream + gold) → for DARK page bg
 *
 * Each consuming app (web/admin/space) ships its own copy under public/images/.
 *
 * Prop compatibility: the previous inline-SVG component took {width, height,
 * className, color}. Existing callsites pass legacy upstream-Plane dims like
 * `width={230} height={20}` which assume an 11.3:1 ratio — the new lockup is
 * 2.83:1, so we cannot honour both dims at once. The component prefers
 * `height` (most callsites bound a header height) and computes width from the
 * natural ratio. `color` is accepted for type-compat but is now a no-op.
 */
export function PlaneLockup({ width, height, className }: ISvgIcons) {
  // Resolve dimensions: prefer caller-supplied `height` (header callsites), fall
  // back to `width`. Whichever is supplied wins; the other auto-computes from
  // the natural ratio. If both were passed we drop `width` so the lockup keeps
  // its proportions instead of stretching.
  let resolvedWidth: number | string | undefined = width;
  let resolvedHeight: number | string | undefined = height;
  if (resolvedHeight !== undefined) {
    if (typeof resolvedHeight === "number") {
      resolvedWidth = Math.round(resolvedHeight * LOCKUP_RATIO);
    } else {
      resolvedWidth = undefined; // string height (e.g. "1.5rem") — let CSS auto-size width
    }
  }

  const baseClass = className ?? "";

  return (
    <>
      {/* Dark-on-light artwork — visible on the default light theme */}
      <img
        src="/images/planeplus-horizontal-dark.svg"
        alt="Plane Plus"
        width={resolvedWidth}
        height={resolvedHeight}
        className={`${baseClass} block dark:hidden`.trim()}
      />
      {/* Light-on-dark artwork — visible on the dark theme */}
      <img
        src="/images/planeplus-horizontal-light.svg"
        alt="Plane Plus"
        width={resolvedWidth}
        height={resolvedHeight}
        className={`${baseClass} hidden dark:block`.trim()}
      />
    </>
  );
}
