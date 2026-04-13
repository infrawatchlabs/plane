/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { InfoIcon } from "lucide-react";
// plane imports
import { EIssueServiceType } from "@plane/types";
import type { TSubIssuesStateDistribution } from "@plane/types";
import { Tooltip } from "@plane/ui";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";

type Props = {
  workspaceSlug: string;
  projectId: string;
  epicId: string;
};

/**
 * Fixed epic state definitions. These map directly to Plane's state groups
 * but use our own labels: Backlog, Todo, In Progress, Done, Cancelled.
 */
const EPIC_STATES = [
  { key: "backlog" as const, label: "Backlog", color: "#a3a3a3" },
  { key: "unstarted" as const, label: "Todo", color: "#3f76ff" },
  { key: "started" as const, label: "In Progress", color: "#f59e0b" },
  { key: "completed" as const, label: "Done", color: "#16a34a" },
  { key: "cancelled" as const, label: "Cancelled", color: "#dc2626" },
] as const;

export const EpicProgressSection = observer(function EpicProgressSection(props: Props) {
  const { epicId } = props;
  // store hooks
  const {
    subIssues: { subIssuesByIssueId, stateDistributionByIssueId },
  } = useIssueDetail(EIssueServiceType.EPICS);
  // derived values
  const subIssues = subIssuesByIssueId(epicId);
  const distribution = stateDistributionByIssueId(epicId);
  const totalCount = subIssues?.length ?? 0;

  // Don't render if no child work items
  if (!totalCount) return null;

  return (
    <div className="space-y-3 py-2">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-primary">Progress</span>
        <Tooltip tooltipContent="Progress is based on state groups of child work items.">
          <InfoIcon className="h-3.5 w-3.5 cursor-help text-tertiary" />
        </Tooltip>
      </div>

      {/* Segmented progress bar */}
      <ProgressBar distribution={distribution} totalCount={totalCount} />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {EPIC_STATES.map((state) => {
          const count = distribution?.[state.key]?.length ?? 0;
          const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
          return (
            <div key={state.key} className="text-xs flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: state.color }} />
              <span className="font-medium text-primary">{state.label}</span>
              <span className="text-tertiary tabular-nums">{percentage}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

/**
 * Horizontal segmented progress bar. Each segment is proportional to the count
 * of child work items in that state group.
 */
const ProgressBar = observer(function ProgressBar({
  distribution,
  totalCount,
}: {
  distribution: TSubIssuesStateDistribution | undefined;
  totalCount: number;
}) {
  if (!totalCount) return null;

  return (
    <div className="bg-custom-background-80 flex h-3 w-full overflow-hidden rounded-full">
      {EPIC_STATES.map((state) => {
        const count = distribution?.[state.key]?.length ?? 0;
        if (count === 0) return null;
        const widthPercent = (count / totalCount) * 100;
        return (
          <Tooltip key={state.key} tooltipContent={`${state.label}: ${count} (${Math.round(widthPercent)}%)`}>
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${widthPercent}%`,
                backgroundColor: state.color,
              }}
            />
          </Tooltip>
        );
      })}
    </div>
  );
});
