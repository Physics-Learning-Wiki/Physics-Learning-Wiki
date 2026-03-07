from __future__ import annotations

import argparse
import sys
from pathlib import Path

import yaml
from yaml.nodes import MappingNode, ScalarNode, SequenceNode


class MkDocsLoader(yaml.SafeLoader):
    pass


def _construct_unknown(loader: MkDocsLoader, node: yaml.Node):
    if isinstance(node, ScalarNode):
        return loader.construct_scalar(node)
    if isinstance(node, SequenceNode):
        return loader.construct_sequence(node)
    if isinstance(node, MappingNode):
        return loader.construct_mapping(node)
    return None


MkDocsLoader.add_constructor(None, _construct_unknown)


def normalize_path(value: str) -> str:
    normalized = value.strip().replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    if normalized.startswith("docs/"):
        normalized = normalized[5:]
    return normalized


def load_yaml(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.load(handle, Loader=MkDocsLoader)
    if not isinstance(data, dict):
        raise ValueError(f"{path} does not contain a YAML mapping")
    return data


def collect_nav_paths(node, collected: set[str]) -> None:
    if isinstance(node, str):
        normalized = normalize_path(node)
        if normalized.endswith(".md"):
            collected.add(normalized)
        return

    if isinstance(node, list):
        for item in node:
            collect_nav_paths(item, collected)
        return

    if isinstance(node, dict):
        for value in node.values():
            collect_nav_paths(value, collected)


def load_ignore_file(path: Path) -> set[str]:
    if not path.exists():
        return set()

    ignored: set[str] = set()
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        ignored.add(normalize_path(line))
    return ignored


def list_markdown_pages(docs_dir: Path) -> set[str]:
    return {path.relative_to(docs_dir).as_posix() for path in docs_dir.rglob("*.md")}


def print_group(title: str, paths: list[str]) -> None:
    print(f"{title} ({len(paths)}):")
    for path in paths:
        print(f"  - {path}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Check that docs Markdown pages are represented in mkdocs nav.")
    parser.add_argument("--mkdocs-file", default="mkdocs.yml", help="Path to the MkDocs configuration file")
    parser.add_argument("--docs-dir", default="docs", help="Path to the docs directory")
    parser.add_argument(
        "--ignore-file",
        default="scripts/nav-coverage-ignore.txt",
        help="Path to the allowlist for intentionally hidden pages",
    )
    args = parser.parse_args()

    mkdocs_file = Path(args.mkdocs_file)
    docs_dir = Path(args.docs_dir)
    ignore_file = Path(args.ignore_file)

    config = load_yaml(mkdocs_file)
    nav_config = config.get("nav")
    if nav_config is None:
        print(f"::error file={mkdocs_file}::Missing 'nav' section in MkDocs config.", file=sys.stderr)
        return 1

    nav_paths: set[str] = set()
    collect_nav_paths(nav_config, nav_paths)

    docs_pages = list_markdown_pages(docs_dir)
    ignored_pages = load_ignore_file(ignore_file)

    missing_pages = sorted(docs_pages - nav_paths)
    ignored_missing = sorted(path for path in missing_pages if path in ignored_pages)
    unexpected_missing = sorted(path for path in missing_pages if path not in ignored_pages)
    stale_ignored = sorted(path for path in ignored_pages if path not in missing_pages)

    if ignored_missing:
        print_group("Known pages outside mkdocs nav", ignored_missing)
        print()

    if unexpected_missing:
        print_group("Unexpected pages outside mkdocs nav", unexpected_missing)
        print(
            "\nAdd these pages to mkdocs.yml nav or to the ignore file if they are intentionally hidden.",
            file=sys.stderr,
        )

    if stale_ignored:
        print_group("Stale ignore entries", stale_ignored)
        print("\nRemove stale entries from the ignore file.", file=sys.stderr)

    if unexpected_missing or stale_ignored:
        return 1

    print(f"MkDocs nav coverage check passed. Checked {len(docs_pages)} Markdown pages against {len(nav_paths)} nav entries.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())