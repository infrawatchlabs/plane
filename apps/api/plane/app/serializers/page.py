# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Third party imports
from rest_framework import serializers
import base64

# Module imports
from .base import BaseSerializer
from plane.utils.content_validator import (
    validate_binary_data,
    validate_html_content,
)
from plane.db.models import (
    Page,
    PageLabel,
    Label,
    ProjectPage,
    Project,
    PageVersion,
)


class PageSerializer(BaseSerializer):
    is_favorite = serializers.BooleanField(read_only=True)
    labels = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=Label.objects.all()),
        write_only=True,
        required=False,
    )
    # Many to many
    label_ids = serializers.ListField(child=serializers.UUIDField(), required=False)
    project_ids = serializers.ListField(child=serializers.UUIDField(), required=False)

    class Meta:
        model = Page
        fields = [
            "id",
            "name",
            "owned_by",
            "access",
            "color",
            "labels",
            "parent",
            "is_favorite",
            "is_locked",
            "archived_at",
            "workspace",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "view_props",
            "logo_props",
            "label_ids",
            "project_ids",
            "folder",
        ]
        read_only_fields = ["workspace", "owned_by"]

    def create(self, validated_data):
        labels = validated_data.pop("labels", None)
        project_id = self.context.get("project_id")
        owned_by_id = self.context["owned_by_id"]
        description_json = self.context["description_json"]
        description_binary = self.context["description_binary"]
        description_html = self.context["description_html"]

        if project_id:
            # Project-scoped page: derive workspace from the project
            project = Project.objects.get(pk=project_id)
            workspace_id = project.workspace_id
            is_global = False
        else:
            # Workspace-level page: workspace_id must be provided directly
            workspace_id = self.context["workspace_id"]
            is_global = True

        # Create the page
        page = Page.objects.create(
            **validated_data,
            description_json=description_json,
            description_binary=description_binary,
            description_html=description_html,
            owned_by_id=owned_by_id,
            workspace_id=workspace_id,
            is_global=is_global,
        )

        # Create the project page association only for project-scoped pages
        if project_id:
            ProjectPage.objects.create(
                workspace_id=page.workspace_id,
                project_id=project_id,
                page_id=page.id,
                created_by_id=page.created_by_id,
                updated_by_id=page.updated_by_id,
            )

        # Create page labels
        if labels is not None:
            PageLabel.objects.bulk_create(
                [
                    PageLabel(
                        label=label,
                        page=page,
                        workspace_id=page.workspace_id,
                        created_by_id=page.created_by_id,
                        updated_by_id=page.updated_by_id,
                    )
                    for label in labels
                ],
                batch_size=10,
            )
        return page

    def update(self, instance, validated_data):
        labels = validated_data.pop("labels", None)
        if labels is not None:
            PageLabel.objects.filter(page=instance).delete()
            PageLabel.objects.bulk_create(
                [
                    PageLabel(
                        label=label,
                        page=instance,
                        workspace_id=instance.workspace_id,
                        created_by_id=instance.created_by_id,
                        updated_by_id=instance.updated_by_id,
                    )
                    for label in labels
                ],
                batch_size=10,
            )

        return super().update(instance, validated_data)


class PageDetailSerializer(PageSerializer):
    description_html = serializers.CharField()

    class Meta(PageSerializer.Meta):
        fields = PageSerializer.Meta.fields + ["description_html"]


class PageVersionSerializer(BaseSerializer):
    class Meta:
        model = PageVersion
        fields = [
            "id",
            "workspace",
            "page",
            "last_saved_at",
            "owned_by",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["workspace", "page"]


class PageVersionDetailSerializer(BaseSerializer):
    class Meta:
        model = PageVersion
        fields = [
            "id",
            "workspace",
            "page",
            "last_saved_at",
            "description_binary",
            "description_html",
            "description_json",
            "owned_by",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["workspace", "page"]


class PageBinaryUpdateSerializer(serializers.Serializer):
    """Serializer for updating page binary description with validation.

    Bugfix 2026-04-22 — two related issues:

    1. description_binary accepted empty string (allow_blank=True) but then
       saved "" to the model's BinaryField, which 500s. Now also accepts
       null explicitly and normalizes any empty/null to None on the model.

    2. description_html updates did not reset description_binary, so the
       collaborative editor kept rendering stale Yjs CRDT state even after
       a hard HTML replace. Observed: 4-60x H1 heading accumulation on
       plan pages despite description_html being cleanly replaced. Fix:
       when description_html changes via this serializer without an
       explicit description_binary payload, null out the binary so the
       editor regenerates its CRDT state from the new HTML on next load.
       (Live collaborative edits use a different websocket path, not this
       PATCH endpoint, so this doesn't affect interactive editing.)
    """

    description_binary = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    description_html = serializers.CharField(required=False, allow_blank=True)
    description_json = serializers.JSONField(required=False, allow_null=True)
    content_format = serializers.ChoiceField(
        choices=["html", "markdown"],
        default="html",
        required=False,
        help_text='Set to "markdown" to send description_html as markdown (converted to HTML before saving).',
    )

    def validate(self, attrs):
        """If content_format is markdown, convert description_html from MD to HTML."""
        content_format = attrs.pop("content_format", "html")
        if content_format == "markdown" and "description_html" in attrs and attrs["description_html"]:
            from plane.utils.markdown import markdown_to_html
            attrs["description_html"] = markdown_to_html(attrs["description_html"])
        return attrs

    def validate_description_binary(self, value):
        """Validate the base64-encoded binary data.

        Normalizes empty string and null to None so the model's BinaryField
        receives a valid value (setting it to "" silently 500s on save).
        """
        if value in (None, ""):
            return None

        try:
            # Decode the base64 data
            binary_data = base64.b64decode(value)

            # Validate the binary data
            is_valid, error_message = validate_binary_data(binary_data)
            if not is_valid:
                raise serializers.ValidationError(f"Invalid binary data: {error_message}")

            return binary_data
        except Exception as e:
            if isinstance(e, serializers.ValidationError):
                raise
            raise serializers.ValidationError("Failed to decode base64 data")

    def validate_description_html(self, value):
        """Validate the HTML content"""
        if not value:
            return value

        # Use the validation function from utils
        is_valid, error_message, sanitized_html = validate_html_content(value)
        if not is_valid:
            raise serializers.ValidationError(error_message)

        # Return sanitized HTML if available, otherwise return original
        return sanitized_html if sanitized_html is not None else value

    def update(self, instance, validated_data):
        """Update the page instance with validated data.

        When description_html is being replaced without an explicit
        description_binary in the payload, auto-null the binary so the
        collaborative editor regenerates its CRDT state from the new HTML
        on next load. Without this, the editor renders stale accumulated
        content from an out-of-sync binary state.
        """
        if "description_binary" in validated_data:
            instance.description_binary = validated_data.get("description_binary")
        elif "description_html" in validated_data:
            # HTML changed, binary not explicitly set — reset binary so editor
            # rebuilds from new HTML. Matches the duplicate-page semantic
            # (see views/page/base.py line ~605: page.description_binary = None).
            instance.description_binary = None

        if "description_html" in validated_data:
            instance.description_html = validated_data.get("description_html")

        if "description_json" in validated_data:
            instance.description_json = validated_data.get("description_json")

        instance.save()
        return instance
