# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# InfraWatch — Epic URL patterns

from django.urls import path

from plane.app.views import (
    IwEpicViewSet,
    IwEpicListEndpoint,
    SubIssuesEndpoint,
    ProjectUserDisplayPropertyEndpoint,
)

urlpatterns = [
    # Epic list (paginated)
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/",
        IwEpicViewSet.as_view({"get": "list", "post": "create"}),
        name="project-epics",
    ),
    # Epic detail
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/<uuid:pk>/",
        IwEpicViewSet.as_view(
            {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}
        ),
        name="project-epics-detail",
    ),
    # Epic list (non-paginated)
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/list/",
        IwEpicListEndpoint.as_view(),
        name="project-epics-list",
    ),
    # Epic sub-issues (child work items)
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/<uuid:issue_id>/sub-issues/",
        SubIssuesEndpoint.as_view(),
        name="project-epics-sub-issues",
    ),
    # Epic user display properties
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics-user-properties/",
        ProjectUserDisplayPropertyEndpoint.as_view(),
        name="project-epics-user-properties",
    ),
    # v2 epic list (cursor-based pagination)
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/v2/epics/",
        IwEpicViewSet.as_view({"get": "v2_list"}),
        name="project-epics-v2",
    ),
    # Epic detail (extended)
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics-detail/",
        IwEpicViewSet.as_view({"get": "retrieve_list"}),
        name="project-epics-detail-list",
    ),
]
