# scripts/generate-nav.py
"""从 docs/ 目录结构自动生成 MkDocs nav 配置，并产出前端章节下拉 JSON。

规则：
1. 每个目录下的 index.md 作为章节首页，其一号标题作为章节名
2. 其他 .md 文件按文件名排序
3. _ 开头的目录和特殊文件自动排除
4. 手动排序：各目录中放置 _order.txt（一行一个文件名），指定顺序
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


EXCLUDE_DIR_PREFIXES = ("_", ".", "community")
EXCLUDE_FILES = {
    "edit-landing.md", "CNAME", "robots.txt", "manifest.webmanifest",
    "favicon.ico", "service-worker.js",
}


def extract_title(md_path: Path) -> str:
    """从 Markdown 文件中提取一级标题。"""
    try:
        text = md_path.read_text(encoding="utf-8")
        match = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
        if match:
            return match.group(1).strip()
    except Exception:
        pass
    return md_path.stem


def load_order(directory: Path) -> dict[str, int]:
    """读取 _order.txt，返回 文件名→序号 的映射。"""
    order_file = directory / "_order.txt"
    if not order_file.exists():
        return {}
    order: dict[str, int] = {}
    for i, line in enumerate(order_file.read_text(encoding="utf-8").splitlines()):
        name = line.strip()
        if name and not name.startswith("#"):
            order[name] = i
    return order


def build_nav(docs_dir: Path, current_dir: Path) -> list:
    """递归构建 nav 结构。"""
    items: list = []
    order = load_order(current_dir)

    subdirs: list[Path] = []
    files: list[Path] = []

    for entry in sorted(current_dir.iterdir()):
        if entry.name.startswith(EXCLUDE_DIR_PREFIXES):
            continue
        if entry.is_dir():
            subdirs.append(entry)
        elif entry.is_file() and entry.suffix == ".md":
            if entry.name == "index.md" or entry.name in EXCLUDE_FILES:
                continue
            files.append(entry)

    def sort_key(p: Path) -> int:
        return order.get(p.name, 9999)

    files.sort(key=sort_key)
    subdirs.sort(key=sort_key)

    for file in files:
        rel_path = file.relative_to(docs_dir).as_posix()
        title = extract_title(file)
        items.append({title: rel_path})

    for subdir in subdirs:
        sub_items = build_nav(docs_dir, subdir)
        if sub_items:
            sub_index = subdir / "index.md"
            sub_title = (
                extract_title(sub_index) if sub_index.exists() else subdir.name
            )
            items.append({sub_title: sub_items})

    return items


def generate_nav_tree_json(docs_dir: Path) -> list:
    """生成前端章节下拉所需的 JSON 数据。"""
    nav = build_nav(docs_dir, docs_dir)

    def convert(node):
        if isinstance(node, str):
            return None
        if isinstance(node, list):
            result = []
            for item in node:
                converted = convert(item)
                if converted:
                    if isinstance(converted, list):
                        result.extend(converted)
                    else:
                        result.append(converted)
            return result
        if isinstance(node, dict):
            result = []
            for key, value in node.items():
                if isinstance(value, str):
                    result.append({"label": key})
                elif isinstance(value, list):
                    children = []
                    for child in value:
                        converted = convert(child)
                        if converted:
                            children.extend(converted if isinstance(converted, list) else [converted])
                    result.append({"label": key, "children": children})
            return result
        return None

    tree = convert(nav) or []
    return tree


def main() -> int:
    docs_dir = Path("docs")
    output_path = Path("docs/_static/js/nav-tree.json")

    tree = generate_nav_tree_json(docs_dir)

    js_content = (
        "// 由 scripts/generate-nav.py 自动生成，勿手动编辑。\n"
        "// Last generated: auto\n"
        f"const NAV_TREE = {json.dumps(tree, ensure_ascii=False, indent=2)};\n"
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(js_content, encoding="utf-8")

    print(f"Nav tree JSON written to {output_path}")
    print(f"  Entries: {len(tree)} top-level chapters")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
