# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# InfraWatch — Epic-specific views
# Epics are issues with type.is_epic=True

from collections import defaultdict

from django.db.models import Count, F, Q
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from plane.app.permissions import ROLE, allow_permission
from plane.db.models import Issue, IssueType, Workspace

from .base import IssueViewSet, IssueListEndpoint


class IwEpicViewSet(IssueViewSet):
    """
    ViewSet for epics — issues whose type has is_epic=True.
    Inherits all behaviour from IssueViewSet but:
    - Scopes queryset to epic-typed issues only
    - Auto-sets type_id on create
    """

    def get_queryset(self):
        return Issue.issue_objects.filter(
            project_id=self.kwargs.get("project_id"),
            workspace__slug=self.kwargs.get("slug"),
            type__is_epic=True,
        ).distinct()

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def create(self, request, slug, project_id):
        workspace = Workspace.objects.get(slug=slug)
        epic_type = IssueType.objects.filter(
            workspace=workspace, is_epic=True
        ).first()
        if epic_type:
            # request.data may be a plain dict (JSON) or a QueryDict (form)
            if hasattr(request.data, "_mutable"):
                request.data._mutable = True
                request.data["type"] = str(epic_type.id)
                request.data._mutable = False
            else:
                request.data["type"] = str(epic_type.id)
        return super().create(request, slug=slug, project_id=project_id)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def analytics(self, request, slug, project_id, pk):
        """Return aggregate analytics for an epic's child work items."""
        # Verify the epic exists
        epic = Issue.issue_objects.filter(
            project_id=project_id,
            workspace__slug=slug,
            type__is_epic=True,
            pk=pk,
        ).first()
        if not epic:
            return Response(
                {"error": "Epic not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        children = Issue.issue_objects.filter(parent_id=pk)
        total = children.count()

        if total == 0:
            return Response(
                {
                    "total_issues": 0,
                    "completed_issues": 0,
                    "cancelled_issues": 0,
                    "started_issues": 0,
                    "unstarted_issues": 0,
                    "backlog_issues": 0,
                    "overdue_issues": 0,
                    "completion_percentage": 0,
                    "distribution": {
                        "state_group": {},
                        "priority": {},
                        "assignee": {},
                    },
                }
            )

        # State group breakdown
        state_counts = dict(
            children.values_list("state__group")
            .annotate(count=Count("id"))
            .values_list("state__group", "count")
        )

        completed = state_counts.get("completed", 0)
        cancelled = state_counts.get("cancelled", 0)
        started = state_counts.get("started", 0)
        unstarted = state_counts.get("unstarted", 0)
        backlog = state_counts.get("backlog", 0)

        # Overdue: target_date < today AND not completed/cancelled
        today = timezone.now().date()
        overdue = children.filter(
            target_date__lt=today,
        ).exclude(
            state__group__in=["completed", "cancelled"],
        ).count()

        # Completion percentage (only completed, excludes cancelled)
        completion_pct = round((completed / total) * 100, 2) if total else 0

        # Priority breakdown
        priority_counts = dict(
            children.values_list("priority")
            .annotate(count=Count("id"))
            .values_list("priority", "count")
        )

        # Assignee breakdown
        assignee_rows = (
            children.filter(
                issue_assignee__deleted_at__isnull=True,
            )
            .values(assignee_id=F("issue_assignee__assignee_id"))
            .annotate(count=Count("id", distinct=True))
        )
        assignee_counts = {
            str(row["assignee_id"]): row["count"]
            for row in assignee_rows
            if row["assignee_id"] is not None
        }

        return Response(
            {
                "total_issues": total,
                "completed_issues": completed,
                "cancelled_issues": cancelled,
                "started_issues": started,
                "unstarted_issues": unstarted,
                "backlog_issues": backlog,
                "overdue_issues": overdue,
                "completion_percentage": completion_pct,
                "distribution": {
                    "state_group": state_counts,
                    "priority": priority_counts,
                    "assignee": assignee_counts,
                },
            }
        )


class IwEpicListEndpoint(IssueListEndpoint):
    """
    Non-paginated epic list endpoint.
    """

    def get_queryset(self):
        return Issue.issue_objects.filter(
            project_id=self.kwargs.get("project_id"),
            workspace__slug=self.kwargs.get("slug"),
            type__is_epic=True,
        ).distinct()
