# scripts/check-format.py
"""检查 Markdown 文件的格式规范。在 CI 中运行，非零退出码表示检查未通过。"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


def _is_escaped(text: str, index: int) -> bool:
    """Return whether the character at index is preceded by an odd number of backslashes."""
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


def _find_backtick_close(
    lines: list[str],
    in_code_block: list[bool],
    start_line: int,
    start_column: int,
    delimiter_length: int,
) -> tuple[int, int] | None:
    """Find the next unescaped backtick run with the same length, outside fenced blocks."""
    for lineno in range(start_line, len(lines)):
        if in_code_block[lineno]:
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


def _mask_markdown_code(lines: list[str], in_code_block: list[bool]) -> list[str]:
    """Mask fenced and inline code while preserving line and column positions."""
    masked = [list(line) for line in lines]
    for lineno, line in enumerate(lines):
        if in_code_block[lineno]:
            masked[lineno] = [" "] * len(line)

    lineno = 0
    while lineno < len(lines):
        if in_code_block[lineno]:
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
                in_code_block,
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
    """Return unescaped $$ delimiter positions in a line with Markdown code already masked."""
    positions: list[int] = []
    index = 0
    while index < len(line) - 1:
        if line[index : index + 2] == "$$" and not _is_escaped(line, index):
            positions.append(index)
            index += 2
        else:
            index += 1
    return positions


def check_file(filepath: Path) -> list[str]:
    """检查单个文件，返回问题列表。"""
    issues: list[str] = []
    try:
        text = filepath.read_text(encoding="utf-8")
    except Exception:
        return [f"{filepath}: 无法读取文件"]

    lines = text.split("\n")

    # 预处理：标记哪些行在代码块内
    in_code_block = [False] * len(lines)
    in_fence = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("```") or stripped.startswith("~~~"):
            in_fence = not in_fence
            in_code_block[i] = True  # 围栏行本身也算在代码块内
        else:
            in_code_block[i] = in_fence

    visible_lines = _mask_markdown_code(lines, in_code_block)

    # 检查 $$ 配对（跳过围栏代码、行内代码和转义美元符号）
    dollar_count = sum(len(_double_dollar_positions(line)) for line in visible_lines)
    if dollar_count % 2 != 0:
        issues.append(f"{filepath}: $$ 不配对 (共 {dollar_count} 个)")

    # 检查行间公式中 \frac 应为 \dfrac（支持跨行 $$ 块，跳过 Markdown 代码）
    in_display_math = False
    for lineno, line in enumerate(visible_lines, start=1):
        positions = _double_dollar_positions(line)
        segment_start = 0
        has_undisplayed_frac = False
        for position in positions:
            if in_display_math and "\\frac{" in line[segment_start:position]:
                has_undisplayed_frac = True
            in_display_math = not in_display_math
            segment_start = position + 2
        if in_display_math and "\\frac{" in line[segment_start:]:
            has_undisplayed_frac = True
        if has_undisplayed_frac:
            issues.append(f"{filepath}:{lineno}: 行间公式中建议用 \\dfrac 替代 \\frac")

    # 检查中英文混排空格（跳过代码块）
    # 中文后接英文/数字
    zh_followed_by_en = re.compile(r"[一-鿿]([A-Za-z0-9])")
    for lineno, line in enumerate(lines, start=1):
        if in_code_block[lineno - 1]:
            continue
        for match in zh_followed_by_en.finditer(line):
            issues.append(
                f"{filepath}:{lineno}:{match.start()}: 中文与英文/数字之间建议加空格"
            )

    # 英文/数字后接中文
    en_followed_by_zh = re.compile(r"([A-Za-z0-9])[一-鿿]")
    for lineno, line in enumerate(lines, start=1):
        if in_code_block[lineno - 1]:
            continue
        for match in en_followed_by_zh.finditer(line):
            issues.append(
                f"{filepath}:{lineno}:{match.start()}: 英文/数字与中文之间建议加空格"
            )

    # 检查空行规范：标题前后应有空行（跳过代码块）
    for lineno, line in enumerate(lines, start=1):
        if in_code_block[lineno - 1]:
            continue
        if line.startswith("#"):
            if lineno > 1 and lines[lineno - 2].strip() != "":
                issues.append(f"{filepath}:{lineno}: 标题前应有空行")

    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description="检查 Markdown 格式规范")
    parser.add_argument("paths", nargs="*", default=["docs"], help="要检查的文件或目录")
    parser.add_argument(
        "--strict", action="store_true", help="严格模式：警告也导致失败"
    )
    args = parser.parse_args()

    all_issues: list[str] = []

    for raw_path in args.paths:
        path = Path(raw_path)
        if path.is_dir():
            for md_file in sorted(path.rglob("*.md")):
                if "superpowers" in md_file.parts:
                    continue
                all_issues.extend(check_file(md_file))
        elif path.is_file():
            if "superpowers" not in Path(raw_path).parts:
                all_issues.extend(check_file(path))

    errors = [i for i in all_issues if "建议" not in i]
    warnings = [i for i in all_issues if "建议" in i]

    if warnings:
        print(f"\n[WARNING] 格式建议 ({len(warnings)}):")
        for w in warnings:
            print(f"  {w}")

    if errors:
        print(f"\n[ERROR] 格式错误 ({len(errors)}):")
        for e in errors:
            print(f"  {e}")
        return 1

    if not warnings and not errors:
        print("[OK] 格式检查通过")

    if args.strict and warnings:
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
