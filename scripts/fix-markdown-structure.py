#!/usr/bin/env python3
"""
Safely repair Markdown block-structure issues that commonly render incorrectly
under Python-Markdown + pymdownx.arithmatex (MkDocs).

Designed for Physics-Learning-Wiki, but dependency-free and usable elsewhere.

Safe automatic fixes:
  1. Normalize line-level display math:
       $$ E = mc^2 $$
     ->
       $$
       E = mc^2
       $$
     and ensure a blank block boundary before/after display math.

  2. Insert a blank line before a new unordered/ordered list when it follows
     a paragraph at the same Markdown container level. This fixes Python-Markdown
     cases where "-" / "1." is rendered as literal text instead of a list.

  3. Preserve nested MkDocs admonitions, blockquotes, front matter, fenced code,
     inline code spans, CRLF/LF style, UTF-8 BOM, and existing valid formatting.

Conservative by design:
  * Embedded forms such as "text $$ x $$" are reported, not rewritten.
  * Unmatched $$ delimiters are reported and math rewriting is disabled for that
    file, because guessing a missing delimiter can corrupt a large region.
  * Generic single-newline "soft breaks" cannot be inferred safely. Use
    --report-soft-breaks to audit them; the script intentionally does not add
    two trailing spaces automatically.

Examples:
  # Fix the whole docs tree in place
  python scripts/fix-markdown-structure.py docs

  # Preview only, suitable for CI
  python scripts/fix-markdown-structure.py docs --check --diff

  # Also report suspicious soft line breaks for manual review
  python scripts/fix-markdown-structure.py docs --check --report-soft-breaks
"""

from __future__ import annotations

import argparse
import difflib
import fnmatch
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

FENCE_RE = re.compile(r"^[ \t]*(`{3,}|~{3,})")
LIST_RE = re.compile(r"^(?P<prefix>[ \t]*(?:>[ \t]?)*[ \t]*)(?P<marker>[-+*]|\d+[.)])(?P<gap>[ \t]+)(?P<rest>\S.*)$")
CONTAINER_RE = re.compile(r"^(?P<prefix>[ \t]*(?:>[ \t]?)*[ \t]*)(?P<body>.*)$")
ATX_HEADING_RE = re.compile(r"^#{1,6}(?:[ \t]+|$)")
ADMONITION_RE = re.compile(r"^(?:\?\?\?\+?|\!\!\!)[ \t]+")
THEMATIC_RE = re.compile(
    r"^(?:"
    r"(?:\*[ \t]*){3,}|"
    r"(?:-[ \t]*){3,}|"
    r"(?:_[ \t]*){3,}"
    r")$"
)
HTML_BLOCK_START_RE = re.compile(r"^\s*<(pre|code|script|style)(?:\s|>|$)", re.I)
HTML_BLOCK_END_TMPL = r"</{tag}\s*>"


@dataclass(slots=True)
class SourceLine:
    text: str
    origin: int
    protected: bool = False


@dataclass(slots=True)
class Finding:
    code: str
    line: int
    message: str
    fixable: bool = False

    def render(self, path: Path) -> str:
        status = "FIX" if self.fixable else "REPORT"
        return f"{path}:{self.line}: [{status} {self.code}] {self.message}"


@dataclass(slots=True)
class ProcessResult:
    text: str
    findings: list[Finding]
    changed: bool


def _is_escaped(text: str, index: int) -> bool:
    backslashes = 0
    index -= 1
    while index >= 0 and text[index] == "\\":
        backslashes += 1
        index -= 1
    return backslashes % 2 == 1


def _backtick_run_length(line: str, index: int) -> int:
    end = index
    while end < len(line) and line[end] == "`":
        end += 1
    return end - index


def _fence_flags(lines: list[str]) -> list[bool]:
    """Mark fenced-code lines, allowing fences nested under indentation/admonitions."""
    flags = [False] * len(lines)
    in_fence = False
    fence_char = ""
    fence_len = 0

    for i, line in enumerate(lines):
        match = FENCE_RE.match(line)
        if match:
            token = match.group(1)
            char = token[0]
            length = len(token)
            if not in_fence:
                in_fence = True
                fence_char = char
                fence_len = length
            elif char == fence_char and length >= fence_len:
                in_fence = False
            flags[i] = True
        else:
            flags[i] = in_fence
    return flags


def _frontmatter_flags(lines: list[str]) -> list[bool]:
    flags = [False] * len(lines)
    if not lines:
        return flags

    first = lines[0].lstrip("\ufeff").strip()
    if first != "---":
        return flags

    flags[0] = True
    for i in range(1, len(lines)):
        flags[i] = True
        if lines[i].strip() in {"---", "..."}:
            break
    return flags


def _html_block_flags(lines: list[str]) -> list[bool]:
    """Protect the small set of raw HTML blocks most likely to contain literal Markdown."""
    flags = [False] * len(lines)
    open_tag: str | None = None

    for i, line in enumerate(lines):
        if open_tag is not None:
            flags[i] = True
            if re.search(HTML_BLOCK_END_TMPL.format(tag=re.escape(open_tag)), line, re.I):
                open_tag = None
            continue

        match = HTML_BLOCK_START_RE.match(line)
        if not match:
            continue

        tag = match.group(1).lower()
        flags[i] = True
        if not re.search(HTML_BLOCK_END_TMPL.format(tag=re.escape(tag)), line, re.I):
            open_tag = tag

    return flags


def _find_backtick_close(
    lines: list[str],
    blocked: list[bool],
    start_line: int,
    start_column: int,
    delimiter_length: int,
) -> tuple[int, int] | None:
    for lineno in range(start_line, len(lines)):
        if blocked[lineno]:
            return None
        line = lines[lineno]
        column = start_column if lineno == start_line else 0
        while column < len(line):
            if line[column] != "`":
                column += 1
                continue
            run_length = _backtick_run_length(line, column)
            if not _is_escaped(line, column) and run_length == delimiter_length:
                return lineno, column
            column += run_length
    return None


def _mask_markdown_code(lines: list[str], blocked: list[bool]) -> list[str]:
    """Mask fenced/raw blocks and inline code while preserving positions."""
    masked = [list(line) for line in lines]
    for lineno, line in enumerate(lines):
        if blocked[lineno]:
            masked[lineno] = [" "] * len(line)

    lineno = 0
    while lineno < len(lines):
        if blocked[lineno]:
            lineno += 1
            continue

        column = 0
        while column < len(lines[lineno]):
            if lines[lineno][column] != "`" or _is_escaped(lines[lineno], column):
                column += 1
                continue

            delimiter_length = _backtick_run_length(lines[lineno], column)
            closing = _find_backtick_close(
                lines,
                blocked,
                lineno,
                column + delimiter_length,
                delimiter_length,
            )
            if closing is None:
                column += delimiter_length
                continue

            closing_line, closing_column = closing
            for code_lineno in range(lineno, closing_line + 1):
                start = column if code_lineno == lineno else 0
                end = (
                    closing_column + delimiter_length
                    if code_lineno == closing_line
                    else len(lines[code_lineno])
                )
                masked[code_lineno][start:end] = [" "] * (end - start)

            if closing_line == lineno:
                column = closing_column + delimiter_length
            else:
                lineno = closing_line
                column = closing_column + delimiter_length

        lineno += 1

    return ["".join(line) for line in masked]


def _double_dollar_positions(line: str) -> list[int]:
    positions: list[int] = []
    i = 0
    while i < len(line) - 1:
        if line[i : i + 2] == "$$" and not _is_escaped(line, i):
            positions.append(i)
            i += 2
        else:
            i += 1
    return positions


def _split_container(line: str) -> tuple[str, str]:
    match = CONTAINER_RE.match(line)
    assert match is not None
    return match.group("prefix"), match.group("body")


def _blank_for_prefix(prefix: str) -> str:
    # For blockquotes, keep the quote markers so the blank line remains inside
    # the quote. For indentation-only containers, keep indentation.
    return prefix.rstrip() if ">" in prefix else prefix


def _body_from_visible(visible: str) -> tuple[str, str]:
    return _split_container(visible)


def _is_list_line(line: str) -> bool:
    match = LIST_RE.match(line)
    if not match:
        return False
    _, body = _split_container(line)
    return not bool(THEMATIC_RE.fullmatch(body.strip()))


def _is_blockish_body(body: str) -> bool:
    stripped = body.strip()
    if not stripped:
        return True
    if stripped == "$$":
        return True
    if ATX_HEADING_RE.match(stripped):
        return True
    if ADMONITION_RE.match(stripped):
        return True
    if FENCE_RE.match(stripped):
        return True
    if THEMATIC_RE.fullmatch(stripped):
        return True
    if stripped.startswith(("<", "[^")):
        return True
    if LIST_RE.match(body):
        return True
    return False


def _protected_and_visible(lines: list[str]) -> tuple[list[bool], list[str]]:
    fenced = _fence_flags(lines)
    frontmatter = _frontmatter_flags(lines)
    html = _html_block_flags(lines)
    blocked = [a or b or c for a, b, c in zip(fenced, frontmatter, html)]
    visible = _mask_markdown_code(lines, blocked)
    return blocked, visible


def _count_visible_dollars(lines: list[str]) -> int:
    blocked, visible = _protected_and_visible(lines)
    total = 0
    for i, line in enumerate(visible):
        if blocked[i]:
            continue
        total += len(_double_dollar_positions(line))
    return total


def _normalize_math(
    lines: list[SourceLine],
    findings: list[Finding],
    allow_rewrite: bool,
) -> list[SourceLine]:
    texts = [line.text for line in lines]
    blocked, visible_lines = _protected_and_visible(texts)
    for i, src in enumerate(lines):
        src.protected = blocked[i]

    if not allow_rewrite:
        return lines

    out: list[SourceLine] = []
    in_display = False

    for i, src in enumerate(lines):
        if src.protected:
            out.append(src)
            continue

        original = src.text
        visible = visible_lines[i]
        prefix, visible_body = _body_from_visible(visible)
        _, original_body = _split_container(original)
        positions = _double_dollar_positions(visible_body)

        if not positions:
            out.append(src)
            continue

        if len(positions) > 2:
            findings.append(
                Finding(
                    "MATH_COMPLEX",
                    src.origin,
                    "同一行出现超过两个未转义的 $$；为避免误改，仅报告。",
                    False,
                )
            )
            out.append(src)
            continue

        if len(positions) == 2:
            first, second = positions
            before = visible_body[:first]
            inner_visible = visible_body[first + 2 : second]
            after = visible_body[second + 2 :]

            if before.strip() or after.strip():
                findings.append(
                    Finding(
                        "MATH_EMBEDDED",
                        src.origin,
                        "检测到嵌在普通文本中的 $$...$$；无法安全判断是否应改为行间公式。",
                        False,
                    )
                )
                out.append(src)
                continue

            if not inner_visible.strip():
                findings.append(
                    Finding(
                        "MATH_EMPTY",
                        src.origin,
                        "检测到空的 $$...$$；未自动改写。",
                        False,
                    )
                )
                out.append(src)
                continue

            # Same-line line-level display math is unambiguous.
            inner_original = original_body[first + 2 : second].strip()
            out.extend(
                [
                    SourceLine(prefix + "$$", src.origin),
                    SourceLine(prefix + inner_original, src.origin),
                    SourceLine(prefix + "$$", src.origin),
                ]
            )
            findings.append(
                Finding(
                    "MATH_ONE_LINE",
                    src.origin,
                    "已将单行 $$...$$ 拆为标准三行行间公式。",
                    True,
                )
            )
            continue

        # Exactly one delimiter.
        pos = positions[0]
        before_visible = visible_body[:pos]
        after_visible = visible_body[pos + 2 :]

        if not before_visible.strip() and not after_visible.strip():
            out.append(src)
            in_display = not in_display
            continue

        if not in_display and not before_visible.strip():
            # "$$ formula" -> "$$" + "formula"
            content = original_body[pos + 2 :].lstrip()
            out.extend(
                [
                    SourceLine(prefix + "$$", src.origin),
                    SourceLine(prefix + content, src.origin),
                ]
            )
            in_display = True
            findings.append(
                Finding(
                    "MATH_OPEN_ATTACHED",
                    src.origin,
                    "已将与公式内容粘连的开启 $$ 独立成行。",
                    True,
                )
            )
            continue

        if in_display and not after_visible.strip():
            # "formula $$" -> "formula" + "$$"
            content = original_body[:pos].rstrip()
            out.extend(
                [
                    SourceLine(prefix + content, src.origin),
                    SourceLine(prefix + "$$", src.origin),
                ]
            )
            in_display = False
            findings.append(
                Finding(
                    "MATH_CLOSE_ATTACHED",
                    src.origin,
                    "已将与公式内容粘连的闭合 $$ 独立成行。",
                    True,
                )
            )
            continue

        findings.append(
            Finding(
                "MATH_AMBIGUOUS",
                src.origin,
                "检测到位置不明确的 $$；未自动改写。",
                False,
            )
        )
        out.append(src)

    return out


def _fix_block_spacing(
    lines: list[SourceLine],
    findings: list[Finding],
) -> list[SourceLine]:
    texts = [line.text for line in lines]
    blocked, visible_lines = _protected_and_visible(texts)
    for i, src in enumerate(lines):
        src.protected = blocked[i]

    out: list[SourceLine] = []
    in_display = False
    need_blank_after_math = False

    def append_blank(prefix: str, origin: int) -> None:
        blank = _blank_for_prefix(prefix)
        if out and out[-1].text.strip() == "":
            return
        out.append(SourceLine(blank, origin, False))

    for i, src in enumerate(lines):
        visible = visible_lines[i]
        prefix, body = _body_from_visible(visible)
        stripped = body.strip()

        if need_blank_after_math:
            if src.text.strip() != "":
                append_blank(prefix, src.origin)
                findings.append(
                    Finding(
                        "MATH_BLANK_AFTER",
                        src.origin,
                        "已在行间公式后补空行。",
                        True,
                    )
                )
            need_blank_after_math = False

        is_standalone_math = (not src.protected) and stripped == "$$"

        if is_standalone_math:
            if not in_display:
                if out and out[-1].text.strip() != "":
                    append_blank(prefix, src.origin)
                    findings.append(
                        Finding(
                            "MATH_BLANK_BEFORE",
                            src.origin,
                            "已在行间公式前补空行。",
                            True,
                        )
                    )
                out.append(src)
                in_display = True
            else:
                out.append(src)
                in_display = False
                need_blank_after_math = True
            continue

        # Do not consider list structure while inside math.
        if in_display:
            out.append(src)
            continue

        list_match = LIST_RE.match(visible) if not src.protected else None
        if list_match:
            _, list_body = _split_container(visible)
            if THEMATIC_RE.fullmatch(list_body.strip()):
                list_match = None

        if list_match and out and out[-1].text.strip() != "":
            prev = out[-1]
            prev_visible = prev.text
            prev_prefix, prev_body = _split_container(prev_visible)
            current_prefix = list_match.group("prefix")

            # Only insert when both lines are at the same container level.
            # This avoids breaking a child list that immediately follows its parent.
            same_container = prev_prefix == current_prefix
            if same_container and not _is_blockish_body(prev_body):
                append_blank(current_prefix, src.origin)
                findings.append(
                    Finding(
                        "LIST_BLANK_BEFORE",
                        src.origin,
                        "已在列表开始前补空行，避免 Python-Markdown 将列表标记渲染成普通文本。",
                        True,
                    )
                )

        out.append(src)

    return out


def _soft_break_findings(lines: list[SourceLine]) -> list[Finding]:
    """Report, but never rewrite, ambiguous Markdown soft line breaks."""
    texts = [line.text for line in lines]
    blocked, visible_lines = _protected_and_visible(texts)
    findings: list[Finding] = []
    in_display = False

    for i in range(len(lines) - 1):
        if blocked[i] or blocked[i + 1]:
            continue

        current = visible_lines[i]
        nxt = visible_lines[i + 1]
        cur_prefix, cur_body = _split_container(current)
        next_prefix, next_body = _split_container(nxt)
        cur = cur_body.rstrip()
        nex = next_body.strip()

        if cur_body.strip() == "$$":
            in_display = not in_display
            continue
        if in_display:
            continue
        if not cur.strip() or not nex:
            continue
        if cur.endswith(("  ", "\\")):
            continue
        if cur_prefix != next_prefix:
            continue
        if _is_blockish_body(cur_body) or _is_blockish_body(next_body):
            continue
        if _is_list_line(current) or _is_list_line(nxt):
            continue
        if cur.lstrip().startswith("|") or nex.startswith("|"):
            continue

        findings.append(
            Finding(
                "SOFT_BREAK",
                lines[i].origin,
                "此处单换行在 Markdown 中通常会折叠为空格；若确实需要强制换行，请在行尾使用两个空格或 <br>。",
                False,
            )
        )

    return findings


def process_text(text: str, report_soft_breaks: bool = False) -> ProcessResult:
    original_exact = text
    bom = "\ufeff" if text.startswith("\ufeff") else ""
    if bom:
        text = text[1:]

    newline = "\r\n" if "\r\n" in text else "\n"
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    had_final_newline = normalized.endswith("\n")
    raw_lines = normalized.split("\n")
    if had_final_newline:
        raw_lines = raw_lines[:-1]

    lines = [SourceLine(line, i + 1) for i, line in enumerate(raw_lines)]
    findings: list[Finding] = []

    dollar_count = _count_visible_dollars(raw_lines)
    math_rewrite_allowed = dollar_count % 2 == 0
    if not math_rewrite_allowed:
        # Find the first visible $$ line for a useful location.
        blocked, visible = _protected_and_visible(raw_lines)
        first_line = 1
        for i, line in enumerate(visible):
            if not blocked[i] and _double_dollar_positions(line):
                first_line = i + 1
                break
        findings.append(
            Finding(
                "MATH_UNMATCHED",
                first_line,
                f"未转义的 $$ 数量为 {dollar_count}（奇数）；为防止扩大错误，本文件禁用数学公式自动重写。",
                False,
            )
        )

    lines = _normalize_math(lines, findings, math_rewrite_allowed)
    lines = _fix_block_spacing(lines, findings)

    if report_soft_breaks:
        findings.extend(_soft_break_findings(lines))

    rendered = "\n".join(line.text for line in lines)
    if had_final_newline:
        rendered += "\n"
    rendered = bom + rendered.replace("\n", newline)

    changed = rendered != original_exact
    return ProcessResult(rendered, findings, changed)


def _load_ignore_patterns(repo_root: Path) -> list[str]:
    path = repo_root / ".remarkignore"
    if not path.is_file():
        return []
    patterns: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            patterns.append(stripped)
    return patterns


def _matches_ignore(rel: str, patterns: Iterable[str]) -> bool:
    rel = rel.replace("\\", "/")
    name = Path(rel).name
    for pattern in patterns:
        p = pattern.replace("\\", "/").strip()
        if p.endswith("/") and (rel.startswith(p) or f"/{p}" in f"/{rel}"):
            return True
        if "/" not in p and fnmatch.fnmatch(name, p):
            return True
        if fnmatch.fnmatch(rel, p):
            return True
    return False


def _collect_markdown(paths: list[Path], repo_root: Path, extra_excludes: list[str]) -> list[Path]:
    ignore_patterns = _load_ignore_patterns(repo_root)
    files: set[Path] = set()

    for path in paths:
        if path.is_file():
            if path.suffix.lower() == ".md":
                files.add(path.resolve())
            continue
        if path.is_dir():
            for candidate in path.rglob("*.md"):
                files.add(candidate.resolve())

    selected: list[Path] = []
    for file in sorted(files):
        try:
            rel = file.relative_to(repo_root.resolve()).as_posix()
        except ValueError:
            rel = file.as_posix()

        # Project-internal docs excluded from MkDocs output should not be mass-edited
        # unless the user explicitly passes those files.
        default_skip = (
            "/superpowers/" in f"/{rel}/"
            or rel.startswith("docs/adr/")
            or rel.startswith("docs/ref-images/")
        )
        explicitly_named = any(p.is_file() and p.resolve() == file for p in paths)
        if default_skip and not explicitly_named:
            continue
        if not explicitly_named and _matches_ignore(rel, ignore_patterns):
            continue
        if any(fnmatch.fnmatch(rel, pat) or pat in rel for pat in extra_excludes):
            continue
        selected.append(file)

    return selected


def _find_repo_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / ".git").exists() or (candidate / "mkdocs.yml").exists():
            return candidate
    return start.resolve()


def _unified_diff(path: Path, old: str, new: str) -> str:
    return "".join(
        difflib.unified_diff(
            old.splitlines(keepends=True),
            new.splitlines(keepends=True),
            fromfile=str(path),
            tofile=str(path),
        )
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Safely repair MkDocs/Python-Markdown block-structure issues."
    )
    parser.add_argument(
        "paths",
        nargs="*",
        default=["docs"],
        help="Markdown file(s) or directory tree(s). Default: docs",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Do not write files. Exit 1 when safe fixes would change files.",
    )
    parser.add_argument(
        "--diff",
        action="store_true",
        help="Print unified diffs for files that would change.",
    )
    parser.add_argument(
        "--report-soft-breaks",
        action="store_true",
        help="Report ambiguous single-newline soft breaks; never auto-fix them.",
    )
    parser.add_argument(
        "--exclude",
        action="append",
        default=[],
        help="Additional glob/substring path to exclude. Repeatable.",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Only print summary/errors.",
    )
    args = parser.parse_args()

    cwd = Path.cwd()
    repo_root = _find_repo_root(cwd)
    raw_paths = [Path(p) if Path(p).is_absolute() else cwd / p for p in args.paths]
    files = _collect_markdown(raw_paths, repo_root, args.exclude)

    if not files:
        print("[WARN] No Markdown files found.", file=sys.stderr)
        return 0

    changed_files = 0
    fix_count = 0
    report_count = 0
    read_errors = 0

    for path in files:
        try:
            old = path.read_text(encoding="utf-8")
        except Exception as exc:
            read_errors += 1
            print(f"[ERROR] {path}: {exc}", file=sys.stderr)
            continue

        result = process_text(old, report_soft_breaks=args.report_soft_breaks)
        fix_findings = [f for f in result.findings if f.fixable]
        report_findings = [f for f in result.findings if not f.fixable]
        fix_count += len(fix_findings)
        report_count += len(report_findings)

        if result.changed:
            changed_files += 1
            if args.diff:
                print(_unified_diff(path, old, result.text), end="")
            if not args.check:
                path.write_text(result.text, encoding="utf-8", newline="")

        if not args.quiet and (result.findings or result.changed):
            try:
                shown = path.relative_to(repo_root)
            except ValueError:
                shown = path
            print(f"\n{shown}:")
            for finding in result.findings:
                print("  " + finding.render(shown))

    mode = "CHECK" if args.check else "WRITE"
    print(
        f"\n[{mode}] scanned={len(files)} changed_files={changed_files} "
        f"safe_fixes={fix_count} reports={report_count} read_errors={read_errors}"
    )

    if read_errors:
        return 2
    if args.check and changed_files:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
