from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from .errors import Issue
from .models import Concept, SourceDocument, TaxonomyRegistry, Topic


def load_yaml(path: Path) -> tuple[SourceDocument | None, list[Issue]]:
    issues: list[Issue] = []
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        return None, [Issue.error(path, "", f"cannot read UTF-8 YAML: {exc}")]
    try:
        documents = list(yaml.safe_load_all(text))
    except yaml.YAMLError as exc:
        return None, [Issue.error(path, "", f"invalid YAML: {exc}")]
    if len(documents) != 1:
        return None, [Issue.error(path, "", "exactly one YAML document is required")]
    if not isinstance(documents[0], dict):
        return None, [Issue.error(path, "", "top-level YAML value must be an object")]
    return SourceDocument(path, documents[0]), issues


def load_tree(directory: Path) -> tuple[list[SourceDocument], list[Issue]]:
    documents: list[SourceDocument] = []
    issues: list[Issue] = []
    if not directory.exists():
        return documents, issues
    for path in sorted([*directory.rglob("*.yml"), *directory.rglob("*.yaml")]):
        document, found = load_yaml(path)
        issues.extend(found)
        if document:
            documents.append(document)
    return documents, issues


def load_json(path: Path) -> dict[str, Any]:
    import json

    return json.loads(path.read_text(encoding="utf-8"))


def load_taxonomy(taxonomy_dir: Path) -> tuple[TaxonomyRegistry, list[Issue]]:
    issues: list[Issue] = []
    topics: dict[str, Topic] = {}
    concepts: dict[str, Concept] = {}
    topic_descendants: dict[str, set[str]] = {}

    topics_file = taxonomy_dir / "topics.yml"
    if not topics_file.exists():
        topics_file = taxonomy_dir / "topics.yaml"
    if topics_file.exists():
        doc, file_issues = load_yaml(topics_file)
        issues.extend(file_issues)
        if doc and isinstance(doc.data, dict):
            for t_id, t_data in doc.data.items():
                if not isinstance(t_id, str):
                    issues.append(Issue.error(topics_file, str(t_id), "topic id must be a string"))
                    continue
                if not isinstance(t_data, dict):
                    issues.append(Issue.error(topics_file, t_id, "topic definition must be an object"))
                    continue
                title = t_data.get("title", "")
                parent = t_data.get("parent")
                topics[t_id] = Topic(id=t_id, title=str(title), parent=parent)

    # Validate parent relations and cycles
    for t_id, topic in topics.items():
        if topic.parent is not None:
            if topic.parent not in topics:
                issues.append(Issue.error(topics_file, t_id, f"topic parent {topic.parent!r} does not exist"))
            else:
                # Cycle check
                curr: str | None = topic.parent
                seen: set[str] = {t_id}
                while curr is not None:
                    if curr in seen:
                        issues.append(Issue.error(topics_file, t_id, f"cyclical topic hierarchy detected at {curr}"))
                        break
                    seen.add(curr)
                    curr = topics[curr].parent if curr in topics else None

    # Compute descendants
    for t_id in topics:
        topic_descendants[t_id] = set()
    for t_id, topic in topics.items():
        curr_parent = topic.parent
        while curr_parent is not None and curr_parent in topics:
            topic_descendants[curr_parent].add(t_id)
            curr_parent = topics[curr_parent].parent

    # Load concepts
    concepts_dir = taxonomy_dir / "concepts"
    if concepts_dir.exists():
        concept_docs, tree_issues = load_tree(concepts_dir)
        issues.extend(tree_issues)
        for c_doc in concept_docs:
            if not isinstance(c_doc.data, dict):
                continue
            for c_id, c_data in c_doc.data.items():
                if not isinstance(c_id, str):
                    issues.append(Issue.error(c_doc.path, str(c_id), "concept id must be a string"))
                    continue
                if c_id in concepts:
                    issues.append(Issue.error(c_doc.path, c_id, f"duplicate concept id {c_id}"))
                    continue
                if not isinstance(c_data, dict):
                    issues.append(Issue.error(c_doc.path, c_id, "concept definition must be an object"))
                    continue
                title = c_data.get("title", "")
                c_topics = c_data.get("topics", [])
                if not isinstance(c_topics, list):
                    issues.append(Issue.error(c_doc.path, f"{c_id}.topics", "must be a list"))
                    c_topics = []
                else:
                    for idx, top_id in enumerate(c_topics):
                        if top_id not in topics:
                            issues.append(Issue.error(c_doc.path, f"{c_id}.topics[{idx}]", f"unknown topic id {top_id}"))
                aliases = c_data.get("aliases", [])
                if not isinstance(aliases, list):
                    aliases = []
                concepts[c_id] = Concept(id=c_id, title=str(title), topics=c_topics, aliases=[str(a) for a in aliases])

    registry = TaxonomyRegistry(topics=topics, concepts=concepts, topic_descendants=topic_descendants)
    return registry, issues
