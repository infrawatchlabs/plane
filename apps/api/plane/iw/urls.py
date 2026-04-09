# InfraWatch — Custom API v1 endpoints
# All endpoints use API key authentication (X-Api-Key header)

from django.urls import path

from .views import (
    PageListCreateAPIEndpoint,
    PageDetailAPIEndpoint,
    PageDescriptionAPIEndpoint,
)

urlpatterns = [
    # Project Pages
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/pages/",
        PageListCreateAPIEndpoint.as_view(http_method_names=["get", "post"]),
        name="iw-project-pages",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/pages/<uuid:page_id>/",
        PageDetailAPIEndpoint.as_view(http_method_names=["get", "patch", "delete"]),
        name="iw-project-page-detail",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/pages/<uuid:page_id>/description/",
        PageDescriptionAPIEndpoint.as_view(http_method_names=["get", "patch"]),
        name="iw-project-page-description",
    ),
]
