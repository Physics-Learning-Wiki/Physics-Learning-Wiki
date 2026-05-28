# scripts/update-authors.py
"""从 git 历史自动提取每页的贡献者，更新 frontmatter 中的 author 字段。

规则：
- 不覆盖手动指定的 author（以 author_source: manual 为标记）
- 通过 git log --follow 获取每个文件的所有修改者
- 按 commit 次数排序
"""
from __future__ import annotations

import subprocess
import sys
from collections import Counter
from pathlib import Path


def get_file_authors(filepath: Path, repo_root: Path) -> list[str]:
    """从 git 历史中提取文件的所有贡献者。"""
    try:
        result = subprocess.run(
            ["git", "log", "--follow", "--format=%an", "--", str(filepath)],
            capture_output=True,
            text=True,
            cwd=str(repo_root),
        )
        if result.returncode != 0:
            return []
        names = [name.strip() for name in result.stdout.strip().split("\n") if name.strip()]
        counter = Counter(names)
        sorted_names = [name for name, _ in counter.most_common()]
        return sorted_names
    except Exception:
        return []


def update_frontmatter(filepath: Path, authors: list[str]) -> bool:
    """更新文件 frontmatter 中的 author 字段。返回是否实际修改。"""
    try:
        text = filepath.read_text(encoding="utf-8")
    except Exception:
        return False

    lines = text.split("\n")

    has_manual = False
    has_author_field = False
    author_line_idx = -1
    in_frontmatter = False
    frontmatter_start = -1
    frontmatter_end = -1

    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped == "---":
            if not in_frontmatter:
                in_frontmatter = True
                frontmatter_start = i
            else:
                frontmatter_end = i
                break
        elif in_frontmatter:
            if stripped.startswith("author_source:") and "manual" in stripped:
                has_manual = True
            if stripped.startswith("author:"):
                has_author_field = True
                author_line_idx = i

    if has_manual:
        print(f"  [SKIP] {filepath}: 手动维护，跳过")
        return False

    # 不覆盖团队默认署名（这些文件的 author 由手动维护）
    DEFAULT_AUTHORS = {"Physics Learning Wiki", "Physics-Learning-Wiki"}
    if has_author_field and author_line_idx >= 0:
        existing_author = lines[author_line_idx].split(":", 1)[1].strip()
        if existing_author in DEFAULT_AUTHORS:
            print(f"  [SKIP] {filepath}: 团队默认署名，跳过")
            return False

    if not authors:
        return False

    new_author = ", ".join(authors)

    if frontmatter_start >= 0 and frontmatter_end >= 0:
        if has_author_field and author_line_idx >= 0:
            lines[author_line_idx] = f"author: {new_author}"
        else:
            lines.insert(frontmatter_end, f"author: {new_author}")
            lines.insert(frontmatter_end + 1, "author_source: auto")
    else:
        lines = [
            "---",
            f"author: {new_author}",
            "author_source: auto",
            "---",
            "",
        ] + lines

    new_text = "\n".join(lines)
    if new_text != text:
        filepath.write_text(new_text, encoding="utf-8")
        return True
    return False


def main() -> int:
    repo_root = Path.cwd()
    docs_dir = repo_root / "docs"

    changed = 0
    skipped = 0

    for md_file in sorted(docs_dir.rglob("*.md")):
        if "community" in md_file.parts:
            continue

        authors = get_file_authors(md_file, repo_root)
        if not authors:
            continue

        if update_frontmatter(md_file, authors):
            names = ", ".join(authors[:3])
            suffix = "..." if len(authors) > 3 else ""
            print(f"  [OK] {md_file}: {names}{suffix}")
            changed += 1
        else:
            skipped += 1

    print(f"\nDone. Updated: {changed}, Skipped: {skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
