#!/usr/bin/env python3
"""Normalize raw LaTeX fragments in Markdown files.

The script uses simple content features to decide whether a paragraph is a
display equation or whether a prose line contains inline math that should be
wrapped with $...$.

It is intentionally conservative:
- fenced code blocks are left untouched
- already delimited math is preserved
- block equations are wrapped in $$...$$ only when the whole paragraph looks
  math-like
"""

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_TARGET = ROOT / "docs" / "thermodynamics" / "chapter-1" / "gas.md"

FENCE_RE = re.compile(r"^([ \t]*)(`{3,}|~{3,})")
CHINESE_RE = re.compile(r"[\u4e00-\u9fff]")
FULLWIDTH_RE = re.compile(r"[\u3000-\u303f\uff00-\uffef]")
LEADING_STAR_RE = re.compile(r"^(\s*)\*(?=\S)(.*)$")
LEADING_LIST_RE = re.compile(r"^(\s*)(?:([*+-])\s+|(\d+[.)])\s+)(.*)$")

MATH_ONLY_LINE_RE = re.compile(r"^[0-9A-Za-z\\\s^_{}()[\].,+=\-*/<>|:;·%]+$")
ASCII_RUN_RE = re.compile(r"[^\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+")
SINGLE_LETTER_RE = re.compile(r"(?<![A-Za-z])([A-Za-z])(?![A-Za-z])")


@dataclass
class Stats:
    display_blocks: int = 0
    inline_spans: int = 0
    single_letters: int = 0


def has_chinese(text: str) -> bool:
    return bool(CHINESE_RE.search(text))


def is_fence_start(line: str) -> bool:
    return bool(FENCE_RE.match(line))


def is_math_only_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    if stripped.startswith("$$") or stripped.startswith("\\["):
        return False
    if has_chinese(stripped):
        return False
    if not MATH_ONLY_LINE_RE.fullmatch(stripped):
        return False
    return bool(re.search(r"[\\^_={}<>|=]", stripped)) or stripped.startswith("\\begin{")


def wrap_fragment(fragment: str, stats: Stats) -> str:
    leading = len(fragment) - len(fragment.lstrip(" \t"))
    trailing = len(fragment) - len(fragment.rstrip(" \t"))
    core = fragment.strip(" \t")
    if not core:
        return fragment
    stats.inline_spans += 1
    return f"{fragment[:leading]}${core}${fragment[len(fragment) - trailing:]}"


def is_safe_math_fragment(fragment: str) -> bool:
    stripped = fragment.strip()
    if not stripped:
        return False
    if stripped in {"*", "+", "-"}:
        return False
    if stripped.startswith("*"):
        return False
    if stripped.count("{") != stripped.count("}"):
        return False
    if stripped.count("[") != stripped.count("]"):
        return False
    return bool(re.search(r"[\\^_={}<>|=]", stripped))


def wrap_inline_math(line: str, stats: Stats) -> str:
    if "$" in line:
        return line

    leading_list = LEADING_LIST_RE.match(line)
    if leading_list:
        prefix = leading_list.group(1) + (leading_list.group(2) or leading_list.group(3) or "") + " "
        return prefix + wrap_inline_math(leading_list.group(4), stats)

    leading_star = LEADING_STAR_RE.match(line)
    if leading_star:
        return leading_star.group(1) + "*" + wrap_inline_math(leading_star.group(2), stats)

    pieces: list[str] = []
    last = 0
    for match in ASCII_RUN_RE.finditer(line):
        start, end = match.span()
        piece = match.group(0)
        if not piece.strip():
            continue

        # Always wrap lone physics symbols such as m, M, T, V, K, R, etc.
        if SINGLE_LETTER_RE.fullmatch(piece.strip()):
            pieces.append(line[last:start])
            pieces.append(wrap_fragment(piece, stats))
            last = end
            stats.single_letters += 1
            continue

        if is_safe_math_fragment(piece):
            pieces.append(line[last:start])
            pieces.append(wrap_fragment(piece, stats))
            last = end

    if not pieces:
        return line

    pieces.append(line[last:])
    return "".join(pieces)


def looks_like_display_block(block: list[str]) -> bool:
    meaningful = [line.strip() for line in block if line.strip()]
    if not meaningful:
        return False

    if any(has_chinese(line) for line in meaningful):
        return False

    if any(line.startswith("\\begin{") for line in meaningful):
        return True

    if len(meaningful) == 1:
        return is_math_only_line(meaningful[0])

    if not all(MATH_ONLY_LINE_RE.fullmatch(line) for line in meaningful):
        return False

    return any(re.search(r"[\\^_={}<>|=]", line) for line in meaningful)


def process_block(block: list[str], stats: Stats) -> list[str]:
    if looks_like_display_block(block):
        stats.display_blocks += 1
        return ["$$", *[line.rstrip() for line in block], "$$"]

    return [wrap_inline_math(line, stats) for line in block]


def collapse_consecutive_dollar_fences(lines: list[str]) -> list[str]:
    collapsed: list[str] = []
    previous_was_fence = False
    for line in lines:
        is_fence = line.strip() == "$$"
        if is_fence and previous_was_fence:
            continue
        collapsed.append(line)
        previous_was_fence = is_fence
    return collapsed


def normalize_markdown(text: str) -> tuple[str, Stats]:
    lines = collapse_consecutive_dollar_fences(text.splitlines())
    out: list[str] = []
    stats = Stats()

    i = 0
    in_fence = False
    fence_marker = ""

    while i < len(lines):
        line = lines[i]

        if line.strip() == "$$":
            out.append(line)
            i += 1
            while i < len(lines):
                out.append(lines[i])
                if lines[i].strip() == "$$":
                    i += 1
                    break
                i += 1
            continue

        if is_fence_start(line):
            out.append(line)
            stripped = line.lstrip()
            marker = re.match(r"(`{3,}|~{3,})", stripped).group(1)
            if not in_fence:
                in_fence = True
                fence_marker = marker[0]
            elif stripped.startswith(fence_marker * 3):
                in_fence = False
                fence_marker = ""
            i += 1
            continue

        if in_fence:
            out.append(line)
            i += 1
            continue

        if not line.strip():
            out.append(line)
            i += 1
            continue

        block: list[str] = []
        while i < len(lines):
            current = lines[i]
            if not current.strip() or is_fence_start(current):
                break
            block.append(current)
            i += 1

        out.extend(process_block(block, stats))

    trailing_newline = text.endswith(("\n", "\r"))
    normalized = "\n".join(out)
    if trailing_newline:
        normalized += "\n"
    return normalized, stats


def process_file(path: Path, dry_run: bool) -> tuple[bool, Stats]:
    original = path.read_text(encoding="utf-8")
    updated, stats = normalize_markdown(original)
    if updated != original and not dry_run:
        path.write_text(updated, encoding="utf-8")
    return updated != original, stats


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize raw LaTeX fragments in Markdown files.")
    parser.add_argument("files", nargs="*", help="Markdown files to process. Defaults to docs/thermodynamics/chapter-1/gas.md")
    parser.add_argument("--dry-run", action="store_true", help="Report changes without writing files")
    args = parser.parse_args()

    targets = [Path(item) for item in args.files] if args.files else [DEFAULT_TARGET]
    changed_any = False

    for target in targets:
        if not target.is_absolute():
            target = ROOT / target
        if not target.exists():
            print(f"skip missing file: {target}")
            continue

        changed, stats = process_file(target, dry_run=args.dry_run)
        changed_any = changed_any or changed
        status = "would update" if args.dry_run else "updated"
        if changed:
            print(
                f"{status}: {target.relative_to(ROOT)} | display blocks: {stats.display_blocks}, "
                f"inline spans: {stats.inline_spans}, single letters: {stats.single_letters}"
            )
        else:
            print(f"no changes: {target.relative_to(ROOT)}")

    return 0 if changed_any or args.dry_run else 1


if __name__ == "__main__":
    raise SystemExit(main())