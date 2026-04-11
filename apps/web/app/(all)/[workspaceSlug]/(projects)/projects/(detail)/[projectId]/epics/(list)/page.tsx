/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
// plane imports
import { ISSUE_DISPLAY_FILTERS_BY_PAGE } from "@plane/constants";
import { EIssueLayoutTypes, EIssuesStoreType } from "@plane/types";
// components
import { PageHead } from "@/components/core/page-title";
import { ProjectLevelWorkItemFiltersHOC } from "@/components/work-item-filters/filters-hoc/project-level";
// hooks
import { useIssues } from "@/hooks/store/use-issues";
import { useProject } from "@/hooks/store/use-project";
import { IssuesStoreContext } from "@/hooks/use-issue-layout-store";
// layouts
import { CalendarLayout } from "@/components/issues/issue-layouts/calendar/roots/project-root";
import { BaseGanttRoot } from "@/components/issues/issue-layouts/gantt";
import { KanBanLayout } from "@/components/issues/issue-layouts/kanban/roots/project-root";
import { ListLayout } from "@/components/issues/issue-layouts/list/roots/project-root";
import { ProjectSpreadsheetLayout } from "@/components/issues/issue-layouts/spreadsheet/roots/project-root";

function EpicIssueLayout(props: { activeLayout: EIssueLayoutTypes | undefined }) {
  switch (props.activeLayout) {
    case EIssueLayoutTypes.LIST:
      return <ListLayout />;
    case EIssueLayoutTypes.KANBAN:
      return <KanBanLayout />;
    case EIssueLayoutTypes.CALENDAR:
      return <CalendarLayout />;
    case EIssueLayoutTypes.GANTT:
      return <BaseGanttRoot />;
    case EIssueLayoutTypes.SPREADSHEET:
      return <ProjectSpreadsheetLayout />;
    default:
      return <ListLayout />;
  }
}

function ProjectEpicsPage() {
  const { workspaceSlug: routerWorkspaceSlug, projectId: routerProjectId } = useParams();
  const workspaceSlug = routerWorkspaceSlug?.toString();
  const projectId = routerProjectId?.toString();
  // hooks
  const { issuesFilter } = useIssues(EIssuesStoreType.EPIC);
  const { getProjectById } = useProject();
  // derived
  const project = projectId ? getProjectById(projectId) : undefined;
  const pageTitle = project?.name ? `${project.name} - Epics` : undefined;
  const workItemFilters = projectId ? issuesFilter?.getIssueFilters(projectId) : undefined;
  const activeLayout = workItemFilters?.displayFilters?.layout;

  useSWR(
    workspaceSlug && projectId ? `PROJECT_EPICS_${workspaceSlug}_${projectId}` : null,
    async () => {
      if (workspaceSlug && projectId) {
        await issuesFilter?.fetchFilters(workspaceSlug, projectId);
      }
    },
    { revalidateIfStale: false, revalidateOnFocus: false }
  );

  if (!workspaceSlug || !projectId || !workItemFilters) return <></>;

  return (
    <IssuesStoreContext.Provider value={EIssuesStoreType.EPIC}>
      <PageHead title={pageTitle} />
      <ProjectLevelWorkItemFiltersHOC
        entityType={EIssuesStoreType.EPIC}
        entityId={projectId}
        filtersToShowByLayout={ISSUE_DISPLAY_FILTERS_BY_PAGE.issues.filters}
        initialWorkItemFilters={workItemFilters}
        updateFilters={issuesFilter?.updateFilterExpression.bind(issuesFilter, workspaceSlug, projectId)}
        projectId={projectId}
        workspaceSlug={workspaceSlug}
      >
        {({ filter: _epicWorkItemsFilter }) => (
          <div className="relative flex h-full w-full flex-col overflow-hidden">
            <EpicIssueLayout activeLayout={activeLayout} />
          </div>
        )}
      </ProjectLevelWorkItemFiltersHOC>
    </IssuesStoreContext.Provider>
  );
}

export default observer(ProjectEpicsPage);
