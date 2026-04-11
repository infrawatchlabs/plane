/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { runInAction } from "mobx";
import { EIssueLayoutTypes } from "@plane/types";
import type { IProjectIssuesFilter } from "@/store/issue/project";
import { ProjectIssuesFilter } from "@/store/issue/project";
import type { IIssueRootStore } from "@/store/issue/root.store";
import { IssueFiltersService } from "@/services/issue_filter.service";

export type IProjectEpicsFilter = IProjectIssuesFilter;

const issueFilterService = new IssueFiltersService();

export class ProjectEpicsFilter extends ProjectIssuesFilter implements IProjectEpicsFilter {
  constructor(_rootStore: IIssueRootStore) {
    super(_rootStore);
    this.rootIssueStore = _rootStore;
  }

  // Override fetchFilters to use epics-user-properties endpoint
  override fetchFilters = async (workspaceSlug: string, projectId: string) => {
    try {
      const _filters = await issueFilterService.fetchProjectEpicFilters(workspaceSlug, projectId);
      const displayFilters = this.computedDisplayFilters(_filters?.display_filters);
      const displayProperties = this.computedDisplayProperties(_filters?.display_properties);
      const kanbanFilters = { group_by: [] as string[], sub_group_by: [] as string[] };

      runInAction(() => {
        this.filters[projectId] = {
          displayFilters,
          displayProperties,
          kanbanFilters,
        };
      });
    } catch {
      // If epics-user-properties fails, set sensible defaults
      runInAction(() => {
        this.filters[projectId] = {
          displayFilters: this.computedDisplayFilters({ layout: EIssueLayoutTypes.LIST }),
          displayProperties: this.computedDisplayProperties(undefined),
          kanbanFilters: { group_by: [], sub_group_by: [] },
        };
      });
    }
  };
}
