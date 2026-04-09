# InfraWatch — Workspace Pages API (API key authenticated)
# Workspace-level pages (not tied to a specific project)

import json
from datetime import datetime

from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import (
    Exists,
    OuterRef,
    Q,
    Value,
    UUIDField,
)
from django.contrib.postgres.aggregates import ArrayAgg
from django.contrib.postgres.fields import ArrayField
from django.db.models.functions import Coalesce
from django.http import StreamingHttpResponse

from rest_framework import status
from rest_framework.response import Response

from plane.api.views.base import BaseAPIView
from plane.app.serializers import (
    PageSerializer,
    PageDetailSerializer,
    PageBinaryUpdateSerializer,
)
from plane.db.models import (
    Page,
    PageLog,
    ProjectPage,
    Workspace,
    UserFavorite,
)
from plane.bgtasks.page_transaction_task import page_transaction
from plane.bgtasks.page_version_task import track_page_version


def _workspace_page_queryset(user, slug):
    """Queryset for workspace-level pages (not scoped to a project)."""
    subquery = UserFavorite.objects.filter(
        user=user,
        entity_type="page",
        entity_identifier=OuterRef("pk"),
        workspace__slug=slug,
    )
    return (
        Page.objects.filter(workspace__slug=slug)
        .filter(parent__isnull=True)
        .filter(Q(owned_by=user) | Q(access=0))
        .select_related("workspace", "owned_by")
        .prefetch_related("projects", "labels")
        .annotate(is_favorite=Exists(subquery))
        .annotate(
            label_ids=Coalesce(
                ArrayAgg(
                    "page_labels__label_id",
                    distinct=True,
                    filter=~Q(page_labels__label_id__isnull=True),
                ),
                Value([], output_field=ArrayField(UUIDField())),
            ),
            project_ids=Coalesce(
                ArrayAgg("projects__id", distinct=True, filter=~Q(projects__id=True)),
                Value([], output_field=ArrayField(UUIDField())),
            ),
        )
        .order_by("-is_favorite", "-created_at")
        .distinct()
    )


class WorkspacePageListCreateAPIEndpoint(BaseAPIView):
    """List and create workspace-level pages via API key."""

    def get(self, request, slug):
        queryset = _workspace_page_queryset(request.user, slug)

        # Optional filter by project_id
        project_id = request.query_params.get("project_id")
        if project_id:
            queryset = queryset.filter(projects__id=project_id)

        serializer = PageSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, slug):
        project_id = request.data.get("project_id")
        if not project_id:
            return Response(
                {"error": "project_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PageSerializer(
            data=request.data,
            context={
                "project_id": project_id,
                "owned_by_id": request.user.id,
                "description_json": request.data.get("description_json", {}),
                "description_binary": request.data.get("description_binary", None),
                "description_html": request.data.get("description_html", "<p></p>"),
            },
        )
        if serializer.is_valid():
            serializer.save()
            page_transaction.delay(
                new_description_html=request.data.get("description_html", "<p></p>"),
                old_description_html=None,
                page_id=serializer.data["id"],
            )
            page = _workspace_page_queryset(request.user, slug).filter(pk=serializer.data["id"]).first()
            return Response(PageDetailSerializer(page).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class WorkspacePageDetailAPIEndpoint(BaseAPIView):
    """Retrieve, update, and delete a workspace page via API key."""

    def get(self, request, slug, page_id):
        page = _workspace_page_queryset(request.user, slug).filter(pk=page_id).first()
        if page is None:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        issue_ids = PageLog.objects.filter(
            page_id=page_id, entity_name="issue"
        ).values_list("entity_identifier", flat=True)

        data = PageDetailSerializer(page).data
        data["issue_ids"] = issue_ids
        return Response(data, status=status.HTTP_200_OK)

    def patch(self, request, slug, page_id):
        try:
            page = Page.objects.get(
                pk=page_id,
                workspace__slug=slug,
            )
        except Page.DoesNotExist:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        if page.is_locked:
            return Response({"error": "Page is locked"}, status=status.HTTP_400_BAD_REQUEST)

        if page.access != request.data.get("access", page.access) and page.owned_by_id != request.user.id:
            return Response(
                {"error": "Access cannot be updated since this page is owned by someone else"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        page_description = page.description_html
        serializer = PageDetailSerializer(page, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            if request.data.get("description_html"):
                page_transaction.delay(
                    new_description_html=request.data.get("description_html", "<p></p>"),
                    old_description_html=page_description,
                    page_id=page_id,
                )
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, slug, page_id):
        try:
            page = Page.objects.get(
                pk=page_id,
                workspace__slug=slug,
            )
        except Page.DoesNotExist:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        if page.archived_at is None:
            return Response(
                {"error": "The page should be archived before deleting"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if page.owned_by_id != request.user.id:
            return Response(
                {"error": "Only owner can delete the page"},
                status=status.HTTP_403_FORBIDDEN,
            )

        page.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WorkspacePageDescriptionAPIEndpoint(BaseAPIView):
    """Get and update workspace page description via API key."""

    def get(self, request, slug, page_id):
        try:
            page = Page.objects.get(
                Q(owned_by=request.user) | Q(access=0),
                pk=page_id,
                workspace__slug=slug,
            )
        except Page.DoesNotExist:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        binary_data = page.description_binary

        def stream_data():
            if binary_data:
                yield binary_data
            else:
                yield b""

        response = StreamingHttpResponse(stream_data(), content_type="application/octet-stream")
        response["Content-Disposition"] = 'attachment; filename="page_description.bin"'
        return response

    def patch(self, request, slug, page_id):
        try:
            page = Page.objects.get(
                Q(owned_by=request.user) | Q(access=0),
                pk=page_id,
                workspace__slug=slug,
            )
        except Page.DoesNotExist:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        if page.is_locked:
            return Response({"error": "Page is locked"}, status=status.HTTP_400_BAD_REQUEST)

        if page.archived_at:
            return Response({"error": "Page is archived"}, status=status.HTTP_400_BAD_REQUEST)

        old_description_html = page.description_html
        existing_instance = json.dumps(
            {"description_html": old_description_html}, cls=DjangoJSONEncoder
        )

        serializer = PageBinaryUpdateSerializer(page, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            if request.data.get("description_html"):
                page_transaction.delay(
                    new_description_html=request.data.get("description_html", "<p></p>"),
                    old_description_html=old_description_html,
                    page_id=page_id,
                )
            track_page_version.delay(
                page_id=page_id,
                existing_instance=existing_instance,
                user_id=request.user.id,
            )
            return Response({"message": "Updated successfully"})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
