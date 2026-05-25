# scripts/check-format.py
"""检查 Markdown 文件的格式规范。在 CI 中运行，非零退出码表示检查未通过。"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


def check_file(filepath: Path) -> list[str]:
    """检查单个文件，返回问题列表。"""
    issues: list[str] = []
    try:
        text = filepath.read_text(encoding="utf-8")
    except Exception:
        return [f"{filepath}: 无法读取文件"]

    lines = text.split("\n")

    # 检查 $$ 配对
    dollar_count = 0
    for lineno, line in enumerate(lines, start=1):
        dollar_count += line.count("$$")
    if dollar_count % 2 != 0:
        issues.append(
            f"{filepath}: $$ 不配对 (共 {dollar_count} 个)"
        )

    # 检查行间公式中 \frac 应为 \dfrac（支持跨行 $$ 块）
    in_display_math = False
    for lineno, line in enumerate(lines, start=1):
        stripped = line.strip()
        if stripped.startswith("$$"):
            in_display_math = not in_display_math
            continue
        if in_display_math and "\\frac{" in line:
            issues.append(
                f"{filepath}:{lineno}: 行间公式中建议用 \\dfrac 替代 \\frac"
            )

    # 检查中英文混排空格
    # 中文后接英文/数字
    zh_followed_by_en = re.compile(r"[一-鿿]([A-Za-z0-9])")
    for lineno, line in enumerate(lines, start=1):
        for match in zh_followed_by_en.finditer(line):
            issues.append(
                f"{filepath}:{lineno}:{match.start()}: 中文与英文/数字之间建议加空格"
            )

    # 英文/数字后接中文
    en_followed_by_zh = re.compile(r"([A-Za-z0-9])[一-鿿]")
    for lineno, line in enumerate(lines, start=1):
        for match in en_followed_by_zh.finditer(line):
            issues.append(
                f"{filepath}:{lineno}:{match.start()}: 英文/数字与中文之间建议加空格"
            )

    # 检查空行规范：标题前后应有空行
    for lineno, line in enumerate(lines, start=1):
        if line.startswith("#"):
            if lineno > 1 and lines[lineno - 2].strip() != "":
                issues.append(
                    f"{filepath}:{lineno}: 标题前应有空行"
                )

    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description="检查 Markdown 格式规范")
    parser.add_argument("paths", nargs="*", default=["docs"], help="要检查的文件或目录")
    parser.add_argument("--strict", action="store_true", help="严格模式：警告也导致失败")
    args = parser.parse_args()

    all_issues: list[str] = []

    for raw_path in args.paths:
        path = Path(raw_path)
        if path.is_dir():
            for md_file in sorted(path.rglob("*.md")):
                all_issues.extend(check_file(md_file))
        elif path.is_file():
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
