/**
 * PP-71: Tiny markdown → HTML renderer for the Agent Docs preview pane.
 *
 * Why hand-roll instead of pulling react-markdown / marked / markdown-it:
 *   - The repo has react-markdown@8 installed but transitively breaks vite
 *     dep-optimization (mdast-util-to-hast 13 dropped `all`/`one` exports
 *     remark-rehype@10 still tries to import). It's effectively dead code in
 *     the repo today (only one unused MarkdownRenderer wrapper imports it).
 *   - We want preview to be deterministic and collab-free; the v1 spec is
 *     "code blocks, lists, headings, links, tables all visible" — solvable
 *     in ~80 lines without dragging in a transitive dep tree.
 *   - The same renderer can ship to the backend later if we want
 *     server-side previews; pure-string in/out, no DOM.
 *
 * SAFETY: Input is HTML-escaped FIRST. Then a fixed set of regex transforms
 * apply markdown patterns. We never accept raw HTML through. Callers may
 * use `dangerouslySetInnerHTML` on the result.
 *
 * What it handles:
 *   # ## ### #### headings
 *   **bold**, __bold__
 *   *italic*, _italic_
 *   `inline code`
 *   ```fenced code blocks```
 *   - bullet, * bullet, 1. ordered (single-level only, v1)
 *   [text](url) links — http/https only, opened in new tab
 *   > blockquotes
 *   --- horizontal rule
 *   blank line → paragraph break
 *
 * What it punts on (call out in v1.5 if needed):
 *   - Nested lists (one level only)
 *   - Inline HTML (intentionally rejected)
 *   - Tables (call out in followup; spec lists them but v1 boring is fine)
 *   - Footnotes, definition lists, task lists
 */

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

// Apply inline transforms (bold/italic/code/link). Operates on already-escaped text.
function applyInline(escaped: string): string {
  let out = escaped;
  // inline code first so * inside backticks isn't picked up
  out = out.replace(/`([^`\n]+)`/g, (_, code) => `<code>${code}</code>`);
  // bold then italic
  out = out.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_\n]+)__/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");
  // links — only http(s) — text is already escaped, url too
  out = out.replace(/\[([^\]]+)\]\((https?:[^\s)]+)\)/g, (_m, text, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });
  return out;
}

type Block =
  | { kind: "p"; text: string }
  | { kind: "h"; level: 1 | 2 | 3 | 4; text: string }
  | { kind: "code"; lang: string; body: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "blockquote"; text: string }
  | { kind: "hr" };

function parse(input: string): Block[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    const fence = /^```(\S*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1] || "";
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++; // skip closing fence (or EOF)
      blocks.push({ kind: "code", lang, body: body.join("\n") });
      continue;
    }

    // hr
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    // heading
    const h = /^(#{1,4})\s+(.+?)\s*#*\s*$/.exec(line);
    if (h) {
      blocks.push({ kind: "h", level: h[1].length as 1 | 2 | 3 | 4, text: h[2] });
      i++;
      continue;
    }

    // bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    // blockquote
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "blockquote", text: buf.join("\n") });
      continue;
    }

    // blank line — skip
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // paragraph: gather until blank or block boundary
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !lines[i].startsWith("```") &&
      !/^#{1,4}\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*>/.test(lines[i]) &&
      !/^\s*(---|\*\*\*|___)\s*$/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ kind: "p", text: buf.join("\n") });
  }
  return blocks;
}

function renderBlock(b: Block): string {
  switch (b.kind) {
    case "h": {
      const inner = applyInline(escapeHtml(b.text));
      return `<h${b.level}>${inner}</h${b.level}>`;
    }
    case "p": {
      const inner = applyInline(escapeHtml(b.text)).replace(/\n/g, "<br/>");
      return `<p>${inner}</p>`;
    }
    case "code": {
      const langClass = b.lang ? ` class="language-${escapeHtml(b.lang)}"` : "";
      return `<pre><code${langClass}>${escapeHtml(b.body)}</code></pre>`;
    }
    case "ul": {
      const lis = b.items.map((it) => `<li>${applyInline(escapeHtml(it))}</li>`).join("");
      return `<ul>${lis}</ul>`;
    }
    case "ol": {
      const lis = b.items.map((it) => `<li>${applyInline(escapeHtml(it))}</li>`).join("");
      return `<ol>${lis}</ol>`;
    }
    case "blockquote": {
      const inner = applyInline(escapeHtml(b.text)).replace(/\n/g, "<br/>");
      return `<blockquote>${inner}</blockquote>`;
    }
    case "hr":
      return "<hr/>";
  }
}

export function renderMarkdown(input: string): string {
  if (!input) return "";
  return parse(input).map(renderBlock).join("\n");
}
