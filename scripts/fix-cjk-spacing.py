# scripts/fix-cjk-spacing.py
"""修复 Markdown 文件中中文与英文/数字之间缺少空格的问题。

用法:
    python scripts/fix-cjk-spacing.py                   # dry-run，预览所有修改
    python scripts/fix-cjk-spacing.py --fix              # 直接修改文件
    python scripts/fix-cjk-spacing.py --fix --file docs/math/calculus/integral.md  # 只修改指定文件
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

# 中文字符范围（CJK Unified Ideographs + 扩展）
CJK = r"一-鿿"
# 英文和数字
EN = r"A-Za-z0-9"

# 中文后接英文/数字：需要在中间加空格
RE_CJK_THEN_EN = re.compile(rf"([{CJK}])([{EN}])")
# 英文/数字后接中文：需要在中间加空格
RE_EN_THEN_CJK = re.compile(rf"([{EN}])([{CJK}])")

# 不应插入空格的例外情况（正则匹配到的占位符）
# 内联代码：`...`
RE_INLINE_CODE = re.compile(r"`[^`]+`")
# URL：http(s)://...
RE_URL = re.compile(r"https?://[^\s)>\]]+")


def protect_special(text: str) -> tuple[str, list[str]]:
    """将不应被修改的部分替换为占位符，返回 (处理后的文本, 被替换的内容列表)。"""
    placeholders: list[str] = []

    def _replace(match: re.Match) -> str:
        idx = len(placeholders)
        placeholders.append(match.group(0))
        return f"\x00PH{idx}\x00"

    # 保护内联代码（反引号内容不参与空格检查）
    text = RE_INLINE_CODE.sub(_replace, text)
    # 保护 URL（链接地址不参与空格检查）
    text = RE_URL.sub(_replace, text)
    # 注意：不保护 LaTeX 命令和行内公式，因为 CI 也会检查其中的空格

    return text, placeholders


def restore_special(text: str, placeholders: list[str]) -> str:
    """将占位符还原为原始内容。"""
    for i, original in enumerate(placeholders):
        text = text.replace(f"\x00PH{i}\x00", original)
    return text


def fix_line(line: str) -> str:
    """修复单行中的中英文空格问题。"""
    # 保护特殊内容
    protected, placeholders = protect_special(line)

    # 插入空格：中文后接英文/数字
    protected = RE_CJK_THEN_EN.sub(r"\1 \2", protected)
    # 插入空格：英文/数字后接中文
    protected = RE_EN_THEN_CJK.sub(r"\1 \2", protected)

    # 还原特殊内容
    return restore_special(protected, placeholders)


def process_file(filepath: Path, fix: bool) -> list[str]:
    """处理单个文件，返回变更描述列表。"""
    try:
        text = filepath.read_text(encoding="utf-8")
    except Exception:
        return [f"[ERROR] 无法读取: {filepath}"]

    lines = text.split("\n")
    changes: list[str] = []
    new_lines: list[str] = []

    # 预处理：标记代码块
    in_fence = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("```") or stripped.startswith("~~~"):
            in_fence = not in_fence
            new_lines.append(line)
            continue

        if in_fence:
            new_lines.append(line)
            continue

        # 跳过 YAML frontmatter
        if i == 0 and stripped == "---":
            new_lines.append(line)
            continue

        fixed = fix_line(line)
        if fixed != line:
            changes.append(f"  {filepath}:{i + 1}:")
            changes.append(f"    - {line}")
            changes.append(f"    + {fixed}")
            new_lines.append(fixed)
        else:
            new_lines.append(line)

    if changes and fix:
        filepath.write_text("\n".join(new_lines), encoding="utf-8")

    return changes


def main() -> int:
    parser = argparse.ArgumentParser(description="修复 Markdown 中中文与英文/数字之间的空格")
    parser.add_argument("--fix", action="store_true", help="直接修改文件（默认仅预览）")
    parser.add_argument("--file", type=str, help="只处理指定文件")
    parser.add_argument("--dir", type=str, default="docs", help="要扫描的目录（默认 docs）")
    args = parser.parse_args()

    files: list[Path] = []
    if args.file:
        files.append(Path(args.file))
    else:
        for md_file in sorted(Path(args.dir).rglob("*.md")):
            if "superpowers" in md_file.parts:
                continue
            files.append(md_file)

    all_changes: list[str] = []
    for filepath in files:
        all_changes.extend(process_file(filepath, args.fix))

    if not all_changes:
        print("[OK] 未发现中英文空格问题")
        return 0

    mode = "已修复" if args.fix else "预览（加 --fix 以实际修改）"
    print(f"\n[{'FIX' if args.fix else 'PREVIEW'}] 中英文空格问题 ({mode}):")
    for line in all_changes:
        print(line)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
