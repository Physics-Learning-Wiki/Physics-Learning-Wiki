# scripts/fix_line_breaks.py
"""为 Markdown 文件的单换行行尾添加两个空格，使渲染时产生真正的换行。

在标准 Markdown 中，行尾两个空格表示硬换行（<br>）。如果两行非空行之间
只有单个换行（没有空行分隔），且前一行末尾没有两个空格，渲染器会将它们
合并为同一段落。本脚本自动在这些行末补上两个空格。

跳过围栏代码块（``` 或 ~~~）内部的行。

使用 --admonition-only 模式时，仅对 ??? 和 !!! 块内的内容行添加空格。
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

import re

# 匹配 ??? 和 !!! admonition 头行（???、???+、???-）
ADMONITION_RE = re.compile(r"^\?{3}[+-]?\s")


def _build_in_admonition(lines: list[str]) -> list[bool]:
    """标记每行是否属于 ??? !!! admonition 块的内容区域。"""
    in_admonition = [False] * len(lines)
    in_fence = False
    in_block = False

    for i, line in enumerate(lines):
        stripped = line.strip()

        # 围栏代码块优先
        if stripped.startswith("```") or stripped.startswith("~~~"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue

        if ADMONITION_RE.match(line):
            in_block = True
            continue

        if in_block:
            if stripped == "":
                # 空行：看下一行是否仍缩进（仍属于 admonition）
                j = i + 1
                while j < len(lines) and lines[j].strip() == "":
                    j += 1
                if j < len(lines) and lines[j].startswith("    "):
                    in_admonition[i] = True  # 块内空行
                else:
                    in_block = False  # 块结束
            elif line.startswith("    "):
                in_admonition[i] = True
            else:
                in_block = False

    return in_admonition


def fix_line_breaks(text: str, admonition_only: bool = False) -> str:
    """在需要的行末添加两个空格，返回处理后的文本。

    Args:
        text: Markdown 文件内容。
        admonition_only: 若为 True，仅处理 ??? !!! admonition 块内的行。
    """
    lines = text.split("\n")
    in_admonition = _build_in_admonition(lines) if admonition_only else None
    result: list[str] = []
    in_fence = False

    for i, line in enumerate(lines):
        stripped = line.strip()

        # 检测围栏代码块的开始/结束
        if stripped.startswith("```") or stripped.startswith("~~~"):
            in_fence = not in_fence

        # 不在代码块内、当前行非空、行末没有两个空格、下一行非空 → 补空格
        if (
            not in_fence
            and stripped != ""
            and not line.endswith("  ")
            and i + 1 < len(lines)
            and lines[i + 1].strip() != ""
            and (in_admonition is None or in_admonition[i])
        ):
            line = line + "  "

        result.append(line)

    return "\n".join(result)


def process_file(filepath: str | Path, admonition_only: bool = False) -> bool:
    """处理单个文件，返回是否有修改。"""
    filepath = Path(filepath)
    old = filepath.read_text(encoding="utf-8")
    new = fix_line_breaks(old, admonition_only=admonition_only)
    if old != new:
        filepath.write_text(new, encoding="utf-8")
        return True
    return False


parser = argparse.ArgumentParser(description="为 Markdown 文件的单换行行尾添加两个空格")
parser.add_argument("directory", nargs="?", help="要递归处理的文件夹")
parser.add_argument("-f", "--files", nargs="+", help="要处理的 Markdown 文件列表")
parser.add_argument(
    "--admonition-only",
    action="store_true",
    help="仅对 ??? !!! admonition 块内的内容行添加空格",
)

if __name__ == "__main__":
    args = parser.parse_args()

    file_list: list[str] = []

    if args.files:
        file_list.extend(f for f in args.files if os.path.splitext(f)[1] == ".md")
    elif args.directory:
        for root, _, files in os.walk(args.directory):
            file_list.extend(
                os.path.join(root, fn)
                for fn in files
                if os.path.splitext(fn)[1] == ".md"
            )
    else:
        parser.print_help()
        exit(0)

    file_list = [f for f in file_list if os.path.isfile(f)]

    print(f"{len(file_list)} file(s) found")

    modified = 0
    for f in file_list:
        if process_file(f, admonition_only=args.admonition_only):
            print(f"  fixed: {f}")
            modified += 1

    print(f"{modified} file(s) modified")
