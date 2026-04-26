# InfraWatch — Agent Docs API (API key authenticated)
#
# Workspace-level markdown notes with optimistic-concurrency single-writer
# semantics. The interface shape mirrors `tools/obsidian/vault.py` so the
# follow-up tooling refactor (PP-73) is a transport-only swap — same
# `get_text(path)`, `put_text(path, content)`, `list_dir(path)`, `delete(path)`
# verbs map cleanly onto these endpoints.
#
# Concurrency contract (see PP-70 spec):
#   - GET returns body + `ETag: "<version>"` header.
#   - PUT requires `If-Match: "<version>"` to update an existing doc; missing
#     If-Match is treated as create-only (412 if the doc already exists).
#   - DELETE also requires `If-Match` for symmetry — single-writer story is
#     the same for deletes.
#   - The read+compare+write happens inside a transaction with
#     `select_for_update()` so concurrent PUTs against the same prior version
#     can't both win. One commits, the other sees the bumped version on its
#     next read inside the txn and returns 409.

import re

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response

from plane.api.views.base import BaseAPIView
from plane.db.models import AgentDoc, Workspace


# ----------------------------------------------------------- path validation --

# v1 only allows .md. Folder structure is encoded in the path itself.
# - Letters, digits, dots, underscores, hyphens, forward slashes.
# - Must end in `.md` (case-sensitive — keep it boring).
# - No leading slash, no `..`, no double slashes.
# - Max 256 chars (matches the column).
_PATH_RE = re.compile(r"^[a-zA-Z0-9._\-/]+\.md$")
_MAX_PATH_LEN = 256


def _validate_path(path: str) -> str | None:
    """Return an error message if the path is invalid, else None.

    Centralised so list-by-prefix and per-doc endpoints reject the same set
    of inputs identically.
    """
    if not path or len(path) > _MAX_PATH_LEN:
        return f"path must be 1..{_MAX_PATH_LEN} chars"
    if path.startswith("/"):
        return "path must not start with /"
    if ".." in path.split("/"):
        return "path must not contain .. segments"
    if "//" in path:
        return "path must not contain // (empty segments)"
    if not _PATH_RE.match(path):
        return "path must match ^[a-zA-Z0-9._\\-/]+\\.md$"
    return None


# ------------------------------------------------------- If-Match parsing --


def _parse_if_match(header_value: str | None) -> int | None:
    """Parse an `If-Match: "<n>"` header into the integer version, or None.

    Accepts both quoted ("12") and unquoted (12) forms — agents writing the
    client are likely to be sloppy about quoting, and rejecting a write
    purely on quote style would be infuriating to debug. Returns None if the
    header is missing or unparseable; callers decide whether None means
    "create-only" (PUT) or "fail" (DELETE).
    """
    if not header_value:
        return None
    v = header_value.strip().strip('"').strip()
    if v == "*":
        # `If-Match: *` is RFC-7232 for "any current version" — we honour it
        # to mean "force write, don't care about version". Matches what
        # `tools/obsidian/vault.py` effectively does today (no version check).
        return -1
    try:
        return int(v)
    except ValueError:
        return None


def _etag(version: int) -> str:
    """Format a version as an HTTP ETag value (always quoted)."""
    return f'"{version}"'


# -------------------------------------------------------------- endpoints --


class AgentDocListAPIEndpoint(BaseAPIView):
    """GET /api/v1/workspaces/<slug>/agent-docs/?prefix=<path>

    List doc summaries (no body). Optional `?prefix=` filters to paths starting
    with that string — supports the tree-navigation use case where the client
    asks for everything under `plans/` or `memory/vikrant/`.
    """

    def get(self, request, slug):
        prefix = request.query_params.get("prefix", "")
        if prefix and _validate_prefix(prefix) is not None:
            return Response(
                {"error": _validate_prefix(prefix)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = AgentDoc.objects.filter(workspace__slug=slug)
        if prefix:
            qs = qs.filter(path__startswith=prefix)
        qs = qs.order_by("path").values(
            "path", "version", "updated_at", "updated_by_id", "created_by_id"
        )

        return Response(list(qs), status=status.HTTP_200_OK)


def _validate_prefix(prefix: str) -> str | None:
    """Prefix is more permissive than a full path — it doesn't need .md and
    can be empty or a directory-style string. We still reject the obvious
    abuse vectors."""
    if len(prefix) > _MAX_PATH_LEN:
        return f"prefix must be <= {_MAX_PATH_LEN} chars"
    if prefix.startswith("/"):
        return "prefix must not start with /"
    if ".." in prefix.split("/"):
        return "prefix must not contain .. segments"
    if "//" in prefix:
        return "prefix must not contain //"
    # Only the character class — no `.md` requirement.
    if not re.match(r"^[a-zA-Z0-9._\-/]*$", prefix):
        return "prefix must match ^[a-zA-Z0-9._\\-/]*$"
    return None


class AgentDocDetailAPIEndpoint(BaseAPIView):
    """GET / PUT / DELETE /api/v1/workspaces/<slug>/agent-docs/<path>

    `<path>` uses Django's `path:` converter so embedded slashes work
    naturally — the client passes `plans/vikrant.md` and we read it as a
    single argument here.
    """

    def get(self, request, slug, doc_path):
        err = _validate_path(doc_path)
        if err:
            return Response({"error": err}, status=status.HTTP_400_BAD_REQUEST)

        try:
            doc = AgentDoc.objects.get(workspace__slug=slug, path=doc_path)
        except AgentDoc.DoesNotExist:
            return Response(
                {"error": "not found"}, status=status.HTTP_404_NOT_FOUND
            )

        resp = Response(
            {
                "path": doc.path,
                "content": doc.content,
                "version": doc.version,
                "updated_at": doc.updated_at,
                "updated_by_id": doc.updated_by_id,
                "created_by_id": doc.created_by_id,
            },
            status=status.HTTP_200_OK,
        )
        resp["ETag"] = _etag(doc.version)
        return resp

    def put(self, request, slug, doc_path):
        err = _validate_path(doc_path)
        if err:
            return Response({"error": err}, status=status.HTTP_400_BAD_REQUEST)

        content = request.data.get("content", "")
        if not isinstance(content, str):
            return Response(
                {"error": "content must be a string"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if_match = _parse_if_match(request.headers.get("If-Match"))

        # Resolve the workspace once — 404 here means the slug is wrong, not
        # that the doc is missing.
        try:
            workspace = Workspace.objects.get(slug=slug)
        except Workspace.DoesNotExist:
            return Response(
                {"error": "workspace not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # The whole read+compare+write is one transaction with
        # select_for_update so concurrent PUTs serialize on the row.
        with transaction.atomic():
            existing = (
                AgentDoc.objects.select_for_update()
                .filter(workspace=workspace, path=doc_path)
                .first()
            )

            if existing is None:
                # Create path. If-Match must be absent (or `*`); a real
                # version on a non-existent doc is nonsense and we 412 it.
                if if_match is not None and if_match != -1:
                    return Response(
                        {
                            "error": "If-Match present but doc does not exist",
                            "current_version": None,
                        },
                        status=status.HTTP_412_PRECONDITION_FAILED,
                    )
                doc = AgentDoc.objects.create(
                    workspace=workspace,
                    path=doc_path,
                    content=content,
                    version=1,
                )
                resp = Response(
                    {
                        "path": doc.path,
                        "version": doc.version,
                        "created": True,
                    },
                    status=status.HTTP_201_CREATED,
                )
                resp["ETag"] = _etag(doc.version)
                return resp

            # Update path. If-Match required (matches the spec — no silent
            # overwrites). Missing → 412. Mismatch → 409 with the current
            # version so the client can refetch and retry.
            if if_match is None:
                return Response(
                    {
                        "error": "If-Match required for update",
                        "current_version": existing.version,
                    },
                    status=status.HTTP_412_PRECONDITION_FAILED,
                )
            if if_match != -1 and if_match != existing.version:
                resp = Response(
                    {
                        "error": "stale version",
                        "current_version": existing.version,
                    },
                    status=status.HTTP_409_CONFLICT,
                )
                resp["ETag"] = _etag(existing.version)
                return resp

            existing.content = content
            existing.version = existing.version + 1
            existing.save(update_fields=["content", "version", "updated_at", "updated_by"])

        resp = Response(
            {
                "path": existing.path,
                "version": existing.version,
                "created": False,
            },
            status=status.HTTP_200_OK,
        )
        resp["ETag"] = _etag(existing.version)
        return resp

    def delete(self, request, slug, doc_path):
        err = _validate_path(doc_path)
        if err:
            return Response({"error": err}, status=status.HTTP_400_BAD_REQUEST)

        if_match = _parse_if_match(request.headers.get("If-Match"))

        with transaction.atomic():
            existing = (
                AgentDoc.objects.select_for_update()
                .filter(workspace__slug=slug, path=doc_path)
                .first()
            )
            if existing is None:
                # Idempotent delete — same as the Obsidian client today.
                return Response(status=status.HTTP_204_NO_CONTENT)

            if if_match is None:
                return Response(
                    {
                        "error": "If-Match required for delete",
                        "current_version": existing.version,
                    },
                    status=status.HTTP_412_PRECONDITION_FAILED,
                )
            if if_match != -1 and if_match != existing.version:
                resp = Response(
                    {
                        "error": "stale version",
                        "current_version": existing.version,
                    },
                    status=status.HTTP_409_CONFLICT,
                )
                resp["ETag"] = _etag(existing.version)
                return resp

            existing.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class AgentDocPreviewAPIEndpoint(BaseAPIView):
    """POST /api/v1/workspaces/<slug>/agent-docs/<path>/preview

    Render the doc's current content as HTML. Server-side render keeps the
    frontend dumb (textarea + an iframe/innerHTML pane is fine) and lets us
    swap the renderer without a frontend change.

    Uses `mistune` (already in requirements/base.txt for other markdown work).
    """

    def post(self, request, slug, doc_path):
        err = _validate_path(doc_path)
        if err:
            return Response({"error": err}, status=status.HTTP_400_BAD_REQUEST)

        # Allow either a body override (preview unsaved content) or read the
        # stored content. The frontend's "preview while typing" path uses the
        # body override; saved-doc preview uses no body.
        override = request.data.get("content")
        if override is not None and not isinstance(override, str):
            return Response(
                {"error": "content must be a string"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if override is None:
            try:
                doc = AgentDoc.objects.get(workspace__slug=slug, path=doc_path)
            except AgentDoc.DoesNotExist:
                return Response(
                    {"error": "not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            source = doc.content
        else:
            source = override

        # Lazy-import so the model layer doesn't pull in the renderer.
        import mistune

        # `escape=True` keeps embedded HTML literal — agents write markdown,
        # not raw HTML, and we don't want a stray `<script>` to execute in
        # the preview pane. mistune 3.x `mistune.html()` does NOT escape by
        # default; `create_markdown(escape=True)` does.
        renderer = mistune.create_markdown(escape=True)
        html = renderer(source)

        return Response({"html": html}, status=status.HTTP_200_OK)
