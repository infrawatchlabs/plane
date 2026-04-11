/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { WikiIcon } from "@plane/propel/icons";
// components
import type { TPowerKSearchResultGroupDetails } from "@/components/power-k/ui/modal/search-results-map";
// local imports
import type { TPowerKSearchResultsKeysExtended } from "../types";

type TSearchResultsGroupsMapExtended = Record<TPowerKSearchResultsKeysExtended, TPowerKSearchResultGroupDetails>;

export const SEARCH_RESULTS_GROUPS_MAP_EXTENDED: TSearchResultsGroupsMapExtended = {
  wiki_page: {
    icon: WikiIcon,
    itemName: (page: { name: string }) => <p>{page.name}</p>,
    path: (page: { id: string; workspace__slug: string }) => `/${page.workspace__slug}/wiki/${page.id}`,
    title: "Wiki",
  },
};
