/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import { Tooltip } from "@plane/propel/tooltip";
import type { TIssue } from "@plane/types";
import { cn, generateWorkItemLink } from "@plane/utils";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useProject } from "@/hooks/store/use-project";
import { usePlatformOS } from "@/hooks/use-platform-os";

interface ParentChipProps {
  issue: TIssue;
}

export const ParentChip = observer(function ParentChip(props: ParentChipProps) {
  const { issue } = props;
  // router
  const { workspaceSlug: routerWorkspaceSlug } = useParams();
  const workspaceSlug = routerWorkspaceSlug?.toString();
  // hooks
  const {
    issue: { getIssueById },
  } = useIssueDetail();
  const { getProjectIdentifierById } = useProject();
  const { isMobile } = usePlatformOS();

  // early return if no parent
  if (!issue.parent_id) return null;

  const parentIssue = getIssueById(issue.parent_id);
  if (!parentIssue) return null;

  const parentProjectIdentifier = getProjectIdentifierById(parentIssue.project_id);
  const parentIdentifier = `${parentProjectIdentifier}-${parentIssue.sequence_id}`;
  const isEpicParent = !!parentIssue.is_epic;
  const icon = isEpicParent ? "\u26A1" : "\u2191";

  const parentLink = generateWorkItemLink({
    workspaceSlug,
    projectId: parentIssue.project_id,
    issueId: parentIssue.id,
    projectIdentifier: parentProjectIdentifier,
    sequenceId: parentIssue.sequence_id,
    isEpic: isEpicParent,
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (parentLink) {
      window.open(parentLink, "_self");
    }
  };

  return (
    <Tooltip tooltipContent={parentIssue.name} isMobile={isMobile} renderByDefault={false}>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "text-xs flex flex-shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 leading-none font-medium",
          isEpicParent ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
        )}
      >
        <span>{icon}</span>
        <span>{parentIdentifier}</span>
      </button>
    </Tooltip>
  );
});
