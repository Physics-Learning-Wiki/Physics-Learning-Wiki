"""批量修复 Markdown 格式问题。

修复内容：
1. H1 → H2（标题降一级）
2. 行间公式中 \\frac → \\dfrac
3. 标题前添加空行
"""
from __future__ import annotations

import re
import sys
from pathlib import Path


def find_code_blocks(lines: list[str]) -> list[bool]:
    """标记哪些行在代码块内。"""
    in_code_block = [False] * len(lines)
    in_fence = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("```") or stripped.startswith("~~~"):
            in_fence = not in_fence
            in_code_block[i] = True
        else:
            in_code_block[i] = in_fence
    return in_code_block


def fix_headings(text: str) -> tuple[str, int]:
    """仅将 H1 (# ) 替换为 H2 (## )，不动其他标题级别。返回 (新文本, 修复数)。"""
    lines = text.split("\n")
    code_blocks = find_code_blocks(lines)
    fixed = []
    count = 0

    for i, line in enumerate(lines):
        if not code_blocks[i]:
            # 只匹配 H1（# 后跟空格），不匹配 ##、### 等
            m = re.match(r"^# (?!#)(.*)", line)
            if m:
                content = m.group(1)
                fixed.append("## " + content)
                count += 1
                continue
        fixed.append(line)

    return "\n".join(fixed), count


def fix_display_math_frac(text: str) -> tuple[str, int]:
    """在行间公式 ($$...$$) 中将 \\frac 替换为 \\dfrac。"""
    lines = text.split("\n")
    code_blocks = find_code_blocks(lines)
    fixed = []
    in_display = False
    count = 0

    for i, line in enumerate(lines):
        if code_blocks[i]:
            fixed.append(line)
            continue

        stripped = line.strip()
        if stripped.startswith("$$"):
            if stripped.endswith("$$") and len(stripped) > 2:
                inner = stripped[2:-2]
                new_inner = inner.replace("\\frac{", "\\dfrac{")
                diff = inner.count("\\frac{") - new_inner.count("\\frac{")
                count += diff
                fixed.append("$$" + new_inner + "$$")
                continue
            else:
                in_display = not in_display
                fixed.append(line)
                continue

        if in_display:
            new_line = line.replace("\\frac{", "\\dfrac{")
            diff = line.count("\\frac{") - new_line.count("\\frac{")
            count += diff
            fixed.append(new_line)
        else:
            fixed.append(line)

    return "\n".join(fixed), count


def fix_blank_before_heading(text: str) -> tuple[str, int]:
    """确保标题前有空行。"""
    lines = text.split("\n")
    code_blocks = find_code_blocks(lines)
    fixed = []
    count = 0

    for i, line in enumerate(lines):
        if not code_blocks[i] and line.startswith("#") and i > 0:
            if fixed and fixed[-1].strip() != "":
                fixed.append("")
                count += 1
        fixed.append(line)

    return "\n".join(fixed), count


def fix_file(filepath: Path, dry_run: bool = False) -> list[str]:
    """修复单个文件，返回修复说明列表。"""
    changes = []
    try:
        text = filepath.read_text(encoding="utf-8")
    except Exception as e:
        return [f"  [ERROR] 无法读取 {filepath}: {e}"]

    original = text

    # 分离 frontmatter
    fm_match = re.match(r"^---\n.*?\n---\n", text, re.DOTALL)
    if fm_match:
        frontmatter = fm_match.group(0)
        body = text[len(frontmatter):]
    else:
        frontmatter = ""
        body = text

    # 1. 修复标题
    body, h1_count = fix_headings(body)
    if h1_count:
        changes.append(f"  H1 → H2: {h1_count} 个")

    # 2. 修复 \frac
    body, frac_count = fix_display_math_frac(body)
    if frac_count:
        changes.append(f"  \\frac → \\dfrac: {frac_count} 处")

    # 3. 修复标题前空行
    body, blank_count = fix_blank_before_heading(body)
    if blank_count:
        changes.append(f"  标题前空行: {blank_count} 处")

    text = frontmatter + body

    if text != original and not dry_run:
        filepath.write_text(text, encoding="utf-8")

    return changes


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="批量修复 Markdown 格式问题")
    parser.add_argument("paths", nargs="*", default=["docs"], help="要处理的目录")
    parser.add_argument("--dry-run", action="store_true", help="只显示会修复的内容，不实际修改")
    parser.add_argument("--skip-pattern", nargs="*", default=[], help="跳过的文件路径模式")
    args = parser.parse_args()

    total_changes = 0
    files_changed = 0

    for raw_path in args.paths:
        path = Path(raw_path)
        if path.is_dir():
            md_files = sorted(path.rglob("*.md"))
        elif path.is_file():
            md_files = [path]
        else:
            print(f"[WARN] 路径不存在: {path}")
            continue

        for md_file in md_files:
            rel = md_file.as_posix()
            if any(pat in rel for pat in args.skip_pattern):
                continue

            changes = fix_file(md_file, dry_run=args.dry_run)
            if changes:
                files_changed += 1
                total_changes += len(changes)
                print(f"\n{rel}:")
                for c in changes:
                    print(c)

    mode = "[DRY RUN] " if args.dry_run else ""
    print(f"\n{mode}共修改 {files_changed} 个文件，{total_changes} 处修复。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
