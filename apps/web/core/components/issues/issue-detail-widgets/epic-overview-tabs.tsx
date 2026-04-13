/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
// plane imports
import type { TIssueServiceType } from "@plane/types";
import { cn } from "@plane/utils";
// local imports
import { SubIssuesCollapsibleContent } from "./sub-issues/content";
import { SubWorkItemTitleActions } from "./sub-issues/title-actions";
import { RelationsCollapsibleContent } from "./relations/content";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled: boolean;
  issueServiceType: TIssueServiceType;
};

type TEpicOverviewTab = "work-items" | "relations";

const TABS: { key: TEpicOverviewTab; label: string }[] = [
  { key: "work-items", label: "Work Items" },
  { key: "relations", label: "Relations" },
];

export const EpicOverviewTabs = observer(function EpicOverviewTabs(props: Props) {
  const { workspaceSlug, projectId, issueId, disabled, issueServiceType } = props;
  const [activeTab, setActiveTab] = useState<TEpicOverviewTab>("work-items");

  return (
    <div className="space-y-3">
      {/* Section header */}
      <span className="text-sm font-medium text-primary">Overview</span>

      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-subtle">
        <div className="flex items-center gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={cn(
                "text-xs relative px-3 py-2 font-medium transition-colors",
                activeTab === tab.key
                  ? "after:bg-primary text-primary after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5"
                  : "text-tertiary hover:text-secondary"
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right-side actions for the active tab */}
        {activeTab === "work-items" && (
          <SubWorkItemTitleActions
            projectId={projectId}
            parentId={issueId}
            disabled={disabled}
            issueServiceType={issueServiceType}
          />
        )}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "work-items" && (
          <SubIssuesCollapsibleContent
            workspaceSlug={workspaceSlug}
            projectId={projectId}
            parentIssueId={issueId}
            disabled={disabled}
            issueServiceType={issueServiceType}
            alwaysVisible
          />
        )}
        {activeTab === "relations" && (
          <RelationsCollapsibleContent
            workspaceSlug={workspaceSlug}
            issueId={issueId}
            disabled={disabled}
            issueServiceType={issueServiceType}
          />
        )}
      </div>
    </div>
  );
});
