# InfraWatch — PageFolder ViewSet for wiki folder management.

from rest_framework import status
from rest_framework.response import Response

from plane.app.serializers import PageFolderSerializer
from plane.db.models import PageFolder, Workspace
from plane.app.permissions import WorkspacePagePermission

from ..base import BaseViewSet


class PageFolderViewSet(BaseViewSet):
    """
    CRUD ViewSet for workspace-level page folders.
    Endpoint: /api/v1/workspaces/{slug}/page-folders/
    """

    serializer_class = PageFolderSerializer
    model = PageFolder
    permission_classes = [WorkspacePagePermission]

    def get_queryset(self):
        return (
            self.filter_queryset(
                super()
                .get_queryset()
                .filter(workspace__slug=self.kwargs.get("slug"))
                .select_related("workspace", "parent_folder")
                .prefetch_related("children")
            )
        )

    def list(self, request, slug):
        queryset = self.get_queryset()
        serializer = PageFolderSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, slug):
        workspace = Workspace.objects.get(slug=slug)
        serializer = PageFolderSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(workspace=workspace)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, slug, pk=None):
        folder = self.get_queryset().filter(pk=pk).first()
        if folder is None:
            return Response(
                {"error": "Folder not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = PageFolderSerializer(folder)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def partial_update(self, request, slug, pk=None):
        try:
            folder = PageFolder.objects.get(
                pk=pk, workspace__slug=slug
            )
        except PageFolder.DoesNotExist:
            return Response(
                {"error": "Folder not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PageFolderSerializer(
            folder, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, slug, pk=None):
        try:
            folder = PageFolder.objects.get(
                pk=pk, workspace__slug=slug
            )
        except PageFolder.DoesNotExist:
            return Response(
                {"error": "Folder not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Promote child folders to the deleted folder's parent
        PageFolder.objects.filter(
            parent_folder=folder
        ).update(parent_folder=folder.parent_folder)

        # Unset folder on pages in this folder (move them to root)
        folder.pages.update(folder=None)

        folder.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
