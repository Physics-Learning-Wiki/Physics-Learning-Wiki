from __future__ import annotations

import re
from pathlib import Path

import frontmatter

from .errors import Issue
from .models import PageContract

PAGE_ID_RE = re.compile(r"^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*)+$")


def discover_page_contracts(root: Path) -> tuple[dict[str, PageContract], list[Issue]]:
    pages: dict[str, PageContract] = {}
    issues: list[Issue] = []
    docs = root / "docs"
    for path in sorted(docs.rglob("*.md")):
        try:
            post = frontmatter.load(path)
        except Exception as exc:  # front matter parsers expose several exception types
            issues.append(Issue.error(path, "front_matter", f"cannot parse: {exc}"))
            continue
        page_id = post.metadata.get("page_id")
        if page_id is None:
            continue
        if not isinstance(page_id, str) or not PAGE_ID_RE.fullmatch(page_id):
            issues.append(Issue.error(path, "page_id", "invalid stable page id"))
            continue
        if page_id in pages:
            issues.append(Issue.error(path, "page_id", f"duplicate page id {page_id}"))
            continue
        objective_map: dict[str, dict[str, str]] = {}
        objectives = post.metadata.get("learning_objectives", [])
        if not isinstance(objectives, list):
            issues.append(Issue.error(path, "learning_objectives", "must be a list"))
            objectives = []
        for index, objective in enumerate(objectives):
            field = f"learning_objectives[{index}]"
            if not isinstance(objective, dict):
                issues.append(Issue.error(path, field, "must be an object"))
                continue
            objective_id = objective.get("id")
            title = objective.get("title")
            anchor = objective.get("anchor")
            if not all(isinstance(value, str) and value for value in (objective_id, title, anchor)):
                issues.append(Issue.error(path, field, "id, title and anchor are required strings"))
                continue
            if objective_id in objective_map:
                issues.append(Issue.error(path, f"{field}.id", "duplicate objective id"))
            if not re.search(rf'''id=["']{re.escape(anchor)}["']''', post.content):
                issues.append(Issue.error(path, f"{field}.anchor", f"anchor {anchor!r} is absent from page source"))
            objective_map[objective_id] = {"id": objective_id, "title": title, "anchor": anchor}
        relative = path.relative_to(docs).with_suffix("").as_posix()
        title_match = re.search(r"^##\s+(.+)$", post.content, re.MULTILINE)
        pages[page_id] = PageContract(
            path=path,
            page_id=page_id,
            title=str(post.metadata.get("title") or (title_match.group(1) if title_match else page_id)),
            url=f"../../{relative}/",
            objectives=objective_map,
            quiz=post.metadata.get("quiz", {}) if isinstance(post.metadata.get("quiz", {}), dict) else {},
        )
    return pages, issues
