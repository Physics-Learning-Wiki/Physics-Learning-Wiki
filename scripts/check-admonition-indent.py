# scripts/check-admonition-indent.py
"""检查 mkdocs ??? / ???+ 块的内容缩进是否为正确的 4 个空格。

规则：
  - `???` 或 `???+` 开头的行之后的内容必须缩进 4 个空格
  - 不允许使用 tab 缩进
  - 不允许使用 2 个空格或其他非 4 空格的缩进
  - 跳过围栏代码块 (``` / ~~~) 内的内容
  - 遇到非空行且缩进为 0 时，视为块结束

用法：
    python scripts/check-admonition-indent.py                  # 检查 docs/
    python scripts/check-admonition-indent.py --fix            # 自动修复
    python scripts/check-admonition-indent.py --dir path/to/md # 指定目录
"""
from __future__ import annotations

import argparse
from pathlib import Path


def check_file(filepath: Path, fix: bool) -> list[str]:
    """检查单个文件，返回问题列表。"""
    try:
        text = filepath.read_text(encoding="utf-8")
    except Exception:
        return [f"[ERROR] 无法读取: {filepath}"]

    lines = text.split("\n")
    issues: list[str] = []
    new_lines: list[str] = []
    in_code = False
    in_block = False
    block_line = 0

    for i, line in enumerate(lines):
        new_line = line
        stripped = line.strip()

        # 跟踪围栏代码块
        if stripped.startswith("```") or stripped.startswith("~~~"):
            in_code = not in_code
            new_lines.append(line)
            continue

        if in_code:
            new_lines.append(line)
            continue

        # 检测 ??? 块开始
        if stripped.startswith("???"):
            in_block = True
            block_line = i
            new_lines.append(line)
            continue

        if in_block:
            if stripped == "":
                new_lines.append(line)
                continue

            # 计算缩进
            indent = len(line) - len(line.lstrip())

            # 缩进为 0 表示块结束
            if indent == 0:
                in_block = False
                new_lines.append(line)
                continue

            # 检查是否有 tab
            has_tab = "\t" in line[:indent]

            # 检查缩进是否为 4 的倍数
            # mkdocs 要求 ??? 块内容缩进 4 个空格
            # 嵌套块内容缩进 8 个空格，以此类推
            if has_tab or indent % 4 != 0:
                # 确定期望的缩进：最近的 4 的倍数向上取整
                expected = ((indent + 3) // 4) * 4
                if expected == 0:
                    expected = 4

                kind = "tab" if has_tab else f"{indent}spaces"
                issues.append(
                    f"  {filepath}:{i + 1}: {kind} (expected {expected}): "
                    f"{line.rstrip()[:80]}"
                )

                if fix:
                    # 将 tab 转换为空格，然后调整到正确的 4 倍缩进
                    expanded = line.replace("\t", "    ")
                    current_indent = len(expanded) - len(expanded.lstrip())
                    # 向上取整到 4 的倍数
                    new_indent = ((current_indent + 3) // 4) * 4
                    new_line = " " * new_indent + expanded.lstrip()

            new_lines.append(new_line)
        else:
            new_lines.append(line)

    if fix and issues:
        filepath.write_text("\n".join(new_lines), encoding="utf-8")

    return issues


def main() -> int:
    parser = argparse.ArgumentParser(
        description="检查 mkdocs ??? 块的缩进是否为 4 个空格"
    )
    parser.add_argument("--fix", action="store_true", help="自动修复缩进")
    parser.add_argument("--dir", type=str, default="docs", help="要扫描的目录")
    args = parser.parse_args()

    all_issues: list[str] = []
    files_checked = 0

    for md_file in sorted(Path(args.dir).rglob("*.md")):
        if "superpowers" in md_file.parts:
            continue
        files_checked += 1
        issues = check_file(md_file, args.fix)
        all_issues.extend(issues)

    if not all_issues:
        print(f"[OK] 检查了 {files_checked} 个文件，未发现缩进问题")
        return 0

    mode = "已修复" if args.fix else "预览（加 --fix 以实际修改）"
    print(f"\n[{'FIX' if args.fix else 'PREVIEW'}] 缩进问题 ({mode}):")
    for issue in all_issues:
        print(issue)
    print(f"\n共 {len(all_issues)} 个问题")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
