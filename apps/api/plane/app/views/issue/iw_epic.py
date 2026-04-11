# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# InfraWatch — Epic-specific views
# Epics are issues with type.is_epic=True

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
            request.data._mutable = True
            request.data["type_id"] = str(epic_type.id)
            request.data._mutable = False
        return super().create(request, slug, project_id)


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
