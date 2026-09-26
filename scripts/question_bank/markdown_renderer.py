from __future__ import annotations

import re

import bleach
import markdown
from pymdownx.arithmatex import arithmatex_fenced_format

# Container prefix: matches leading quote '>' or list markers like '- ', '* ', '+ ', '1. ', '1) ', indented with spaces
CONTAINER_PREFIX_RE = re.compile(r"^\s*(?:(?:>\s*)+|(?:[-*+]|\d+[.)])\s+)?")

# Fenced code open regex: 0-3 spaces, then 3+ backticks or tildes, then info string
FENCE_OPEN_RE = re.compile(r"^( {0,3})(`{3,}|~{3,})(.*)$")

ALLOWED_TAGS = {
    "p", "br", "em", "strong", "code", "pre", "ul", "ol", "li", "blockquote",
    "span", "div", "table", "thead", "tbody", "tr", "th", "td", "a", "img",
}
ALLOWED_ATTRIBUTES = {
    "*": ["class", "aria-label"],
    "a": ["href", "title", "class", "aria-label"],
    "img": ["src", "alt", "title", "class", "data-plw-asset", "loading", "decoding"],
}
ASSET_SRC_RE = re.compile(r'\ssrc="asset:([a-z][a-z0-9-]{0,31})"')


def _allow_url(value: str) -> str:
    stripped = value.strip()
    if stripped.startswith(("https://", "./", "../", "#", "/")):
        return stripped
    return "#"


def mask_markdown_code(text: str) -> str:
    """Mask fenced code blocks and inline code spans with spaces.

    Preserves exact character length, line numbers, and offsets of the original string.
    """
    lines = text.splitlines(keepends=True)
    out_lines: list[str] = []
    in_fence = False
    fence_char = ""
    fence_len = 0

    for line in lines:
        stripped_line = line.rstrip("\r\n")
        nl = line[len(stripped_line) :]
        if in_fence:
            close_match = re.match(
                r"^( {0,3})(" + re.escape(fence_char) + r"{" + str(fence_len) + r",})\s*$",
                stripped_line,
            )
            out_lines.append(" " * len(stripped_line) + nl)
            if close_match:
                in_fence = False
        else:
            open_match = FENCE_OPEN_RE.match(stripped_line)
            if open_match and (open_match.group(2)[0] == "~" or "`" not in open_match.group(3)):
                in_fence = True
                fence_char = open_match.group(2)[0]
                fence_len = len(open_match.group(2))
                out_lines.append(" " * len(stripped_line) + nl)
            else:
                out_lines.append(line)

    masked_text = "".join(out_lines)

    chars = list(masked_text)
    idx = 0
    length = len(chars)
    while idx < length:
        if chars[idx] == "`":
            start = idx
            while idx < length and chars[idx] == "`":
                idx += 1
            run_len = idx - start
            closer_start = -1
            scan = idx
            while scan < length:
                if chars[scan] == "`":
                    c_start = scan
                    while scan < length and chars[scan] == "`":
                        scan += 1
                    c_len = scan - c_start
                    if c_len == run_len:
                        closer_start = c_start
                        break
                else:
                    scan += 1
            if closer_start != -1:
                for k in range(start, scan):
                    if chars[k] not in ("\r", "\n"):
                        chars[k] = " "
                idx = scan
        else:
            idx += 1

    return "".join(chars)


def normalize_compact_display_math(text: str) -> str:
    """Normalize standalone compact $$...$$ lines into block format.

    Preserves indentation and container prefix (e.g. list, blockquote).
    Strictly applies only to standalone lines where $$ is not embedded in prose.
    Does not touch fenced code or inline code.
    """
    masked = mask_markdown_code(text)
    lines = text.splitlines(keepends=True)
    masked_lines = masked.splitlines(keepends=True)

    out: list[str] = []
    for raw_line, m_line in zip(lines, masked_lines):
        raw_stripped = raw_line.rstrip("\r\n")
        nl = raw_line[len(raw_stripped) :] or "\n"
        m_stripped = m_line.rstrip("\r\n")

        m_prefix_match = CONTAINER_PREFIX_RE.match(m_stripped)
        prefix_len = len(m_prefix_match.group(0)) if m_prefix_match else 0

        rem_m = m_stripped[prefix_len:].strip()

        if (
            rem_m.startswith("$$")
            and rem_m.endswith("$$")
            and len(rem_m) > 4
            and rem_m.count("$$") == 2
        ):
            before_open = m_stripped[prefix_len : m_stripped.find("$$")].strip()
            after_close = m_stripped[m_stripped.rfind("$$") + 2 :].strip()
            if not before_open and not after_close:
                open_pos = m_stripped.find("$$")
                line_prefix = raw_stripped[:open_pos]
                formula = raw_stripped[open_pos + 2 : raw_stripped.rfind("$$")].strip()
                out.append(f"{line_prefix}$${nl}{line_prefix}{formula}{nl}{line_prefix}$${nl}")
                continue

        out.append(raw_line)

    return "".join(out)


def render_markdown(source: str) -> str:
    # 1. Compatibility normalization for standalone compact $$...$$
    source = normalize_compact_display_math(source)

    # 2. In Python-Markdown with pymdownx, block math ($$...$$) within list items or containers
    # is reliably rendered across all list depths and formatting contexts using superfences math.
    masked = mask_markdown_code(source)
    lines = source.splitlines(keepends=True)
    masked_lines = masked.splitlines(keepends=True)

    converted_lines: list[str] = []
    i = 0
    n = len(lines)
    while i < n:
        raw_line = lines[i]
        m_line = masked_lines[i]
        raw_stripped = raw_line.rstrip("\r\n")
        nl = raw_line[len(raw_stripped) :] or "\n"
        m_stripped = m_line.rstrip("\r\n")

        m_prefix_match = CONTAINER_PREFIX_RE.match(m_stripped)
        prefix_len = len(m_prefix_match.group(0)) if m_prefix_match else 0
        rem_m = m_stripped[prefix_len:].strip()

        if rem_m == "$$":
            open_pos = m_stripped.find("$$")
            line_prefix = raw_stripped[:open_pos]

            closing_idx = -1
            for j in range(i + 1, n):
                cj_m = masked_lines[j].rstrip("\r\n")
                cj_prefix = CONTAINER_PREFIX_RE.match(cj_m)
                cj_len = len(cj_prefix.group(0)) if cj_prefix else 0
                if cj_m[cj_len:].strip() == "$$":
                    closing_idx = j
                    break

            if closing_idx != -1:
                converted_lines.append(f"{line_prefix}```math{nl}")
                for k in range(i + 1, closing_idx):
                    formula_line = lines[k]
                    if formula_line.startswith(line_prefix):
                        formula_line = formula_line[len(line_prefix) :]
                    converted_lines.append(f"{line_prefix}{formula_line}")
                converted_lines.append(f"{line_prefix}```{nl}")
                i = closing_idx + 1
                continue

        converted_lines.append(raw_line)
        i += 1

    source_for_md = "".join(converted_lines)

    rendered = markdown.markdown(
        source_for_md,
        extensions=["pymdownx.arithmatex", "pymdownx.superfences"],
        extension_configs={
            "pymdownx.arithmatex": {"generic": True},
            "pymdownx.superfences": {
                "custom_fences": [
                    {
                        "name": "math",
                        "class": "arithmatex",
                        "format": arithmatex_fenced_format(mode="generic"),
                    }
                ]
            },
        },
    )
    cleaned = bleach.clean(
        rendered,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols={"https", "asset"},
        strip=True,
    )
    cleaned = ASSET_SRC_RE.sub(r' data-plw-asset="\1" loading="lazy" decoding="async"', cleaned)
    return bleach.linkifier.Linker(callbacks=[lambda attrs, _new: attrs]).linkify(cleaned)
