/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { observer } from "mobx-react";
// plane imports
import type { TIssueServiceType, TWorkItemWidgets } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
// local imports
import { AttachmentsCollapsible } from "./attachments";
import { IssueDetailWidgetActionButtons } from "./action-buttons";
import { EpicOverviewTabs } from "./epic-overview-tabs";
import { IssueDetailWidgetCollapsibles } from "./issue-detail-widget-collapsibles";
import { IssueDetailWidgetModals } from "./issue-detail-widget-modals";
import { LinksCollapsible } from "./links";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled: boolean;
  renderWidgetModals?: boolean;
  issueServiceType: TIssueServiceType;
  hideWidgets?: TWorkItemWidgets[];
};

export const IssueDetailWidgets = observer(function IssueDetailWidgets(props: Props) {
  const {
    workspaceSlug,
    projectId,
    issueId,
    disabled,
    renderWidgetModals = true,
    issueServiceType,
    hideWidgets,
  } = props;

  const isEpic = issueServiceType === EIssueServiceType.EPICS;

  // For epics, check link/attachment counts to show collapsibles below the tabs
  const {
    issue: { getIssueById },
    attachment: { getAttachmentsCountByIssueId, getAttachmentsUploadStatusByIssueId },
  } = useIssueDetail(issueServiceType);
  const issue = getIssueById(issueId);
  const attachmentsCount = getAttachmentsCountByIssueId(issueId);
  const attachmentUploads = getAttachmentsUploadStatusByIssueId(issueId);
  const shouldRenderLinks = isEpic && !!issue?.link_count && issue.link_count > 0;
  const shouldRenderAttachments =
    isEpic && (attachmentsCount > 0 || (!!attachmentUploads && attachmentUploads.length > 0));

  return (
    <>
      <div className="flex flex-col space-y-4">
        <IssueDetailWidgetActionButtons
          workspaceSlug={workspaceSlug}
          projectId={projectId}
          issueId={issueId}
          disabled={disabled}
          issueServiceType={issueServiceType}
          hideWidgets={hideWidgets}
        />
        {isEpic ? (
          <>
            <EpicOverviewTabs
              workspaceSlug={workspaceSlug}
              projectId={projectId}
              issueId={issueId}
              disabled={disabled}
              issueServiceType={issueServiceType}
            />
            {/* Links and attachments rendered as collapsibles below epic tabs */}
            <div className="flex flex-col">
              {shouldRenderLinks && (
                <LinksCollapsible
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                  issueId={issueId}
                  disabled={disabled}
                  issueServiceType={issueServiceType}
                />
              )}
              {shouldRenderAttachments && (
                <AttachmentsCollapsible
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                  issueId={issueId}
                  disabled={disabled}
                  issueServiceType={issueServiceType}
                />
              )}
            </div>
          </>
        ) : (
          <IssueDetailWidgetCollapsibles
            workspaceSlug={workspaceSlug}
            projectId={projectId}
            issueId={issueId}
            disabled={disabled}
            issueServiceType={issueServiceType}
            hideWidgets={hideWidgets}
          />
        )}
      </div>
      {renderWidgetModals && (
        <IssueDetailWidgetModals
          workspaceSlug={workspaceSlug}
          projectId={projectId}
          issueId={issueId}
          issueServiceType={issueServiceType}
          hideWidgets={hideWidgets}
        />
      )}
    </>
  );
});
