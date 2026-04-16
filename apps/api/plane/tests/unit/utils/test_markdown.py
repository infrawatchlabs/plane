# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest
from plane.utils.markdown import markdown_to_html, html_to_markdown


@pytest.mark.unit
class TestMarkdownToHtml:
    """Test markdown_to_html conversion."""

    def test_basic_paragraph(self):
        result = markdown_to_html("Hello world")
        assert "<p>" in result
        assert "Hello world" in result

    def test_heading(self):
        result = markdown_to_html("# Heading 1")
        assert "<h1>" in result
        assert "Heading 1" in result

    def test_bold(self):
        result = markdown_to_html("**bold text**")
        assert "<strong>" in result
        assert "bold text" in result

    def test_italic(self):
        result = markdown_to_html("*italic text*")
        assert "<em>" in result
        assert "italic text" in result

    def test_unordered_list(self):
        result = markdown_to_html("- item 1\n- item 2")
        assert "<li>" in result
        assert "item 1" in result
        assert "item 2" in result

    def test_ordered_list(self):
        result = markdown_to_html("1. first\n2. second")
        assert "<ol>" in result
        assert "first" in result

    def test_code_block(self):
        result = markdown_to_html("```python\nprint('hello')\n```")
        assert "<code>" in result
        assert "print" in result

    def test_inline_code(self):
        result = markdown_to_html("Use `foo()` here")
        assert "<code>" in result
        assert "foo()" in result

    def test_link(self):
        result = markdown_to_html("[Plane](https://plane.so)")
        assert "<a" in result
        assert "https://plane.so" in result

    def test_empty_input(self):
        assert markdown_to_html("") == "<p></p>"
        assert markdown_to_html("   ") == "<p></p>"
        assert markdown_to_html(None) == "<p></p>"


@pytest.mark.unit
class TestHtmlToMarkdown:
    """Test html_to_markdown conversion."""

    def test_basic_paragraph(self):
        result = html_to_markdown("<p>Hello world</p>")
        assert "Hello world" in result

    def test_heading(self):
        result = html_to_markdown("<h1>Heading 1</h1>")
        assert "# Heading 1" in result

    def test_bold(self):
        result = html_to_markdown("<p><strong>bold</strong></p>")
        assert "**bold**" in result

    def test_italic(self):
        result = html_to_markdown("<p><em>italic</em></p>")
        assert "*italic*" in result

    def test_unordered_list(self):
        result = html_to_markdown("<ul><li>item 1</li><li>item 2</li></ul>")
        assert "item 1" in result
        assert "item 2" in result

    def test_link(self):
        result = html_to_markdown('<p><a href="https://plane.so">Plane</a></p>')
        assert "https://plane.so" in result
        assert "Plane" in result

    def test_empty_input(self):
        assert html_to_markdown("") == ""
        assert html_to_markdown("   ") == ""
        assert html_to_markdown(None) == ""


@pytest.mark.unit
class TestRoundTrip:
    """Test MD -> HTML -> MD preserves content (not necessarily identical formatting)."""

    def test_paragraph_round_trip(self):
        md = "Hello world"
        html = markdown_to_html(md)
        result = html_to_markdown(html)
        assert "Hello world" in result

    def test_heading_round_trip(self):
        md = "## Section Title"
        html = markdown_to_html(md)
        result = html_to_markdown(html)
        assert "Section Title" in result
        assert "##" in result

    def test_list_round_trip(self):
        md = "- alpha\n- beta\n- gamma"
        html = markdown_to_html(md)
        result = html_to_markdown(html)
        assert "alpha" in result
        assert "beta" in result
        assert "gamma" in result

    def test_mixed_content_round_trip(self):
        md = "# Title\n\nSome **bold** and *italic* text.\n\n- item 1\n- item 2"
        html = markdown_to_html(md)
        result = html_to_markdown(html)
        assert "Title" in result
        assert "bold" in result
        assert "italic" in result
        assert "item 1" in result
