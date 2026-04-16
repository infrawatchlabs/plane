# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""
Markdown <-> HTML conversion utilities.

Used by the page description API to let API/MCP clients send and
receive markdown instead of HTML.  HTML remains the single storage
format — conversion happens at the API boundary only.
"""

import mistune
from markdownify import markdownify as _markdownify


def markdown_to_html(md_text: str) -> str:
    """Convert markdown text to HTML."""
    if not md_text or not md_text.strip():
        return "<p></p>"
    return mistune.html(md_text)


def html_to_markdown(html_text: str) -> str:
    """Convert HTML to markdown."""
    if not html_text or not html_text.strip():
        return ""
    return _markdownify(html_text, heading_style="ATX", strip=["img"])
