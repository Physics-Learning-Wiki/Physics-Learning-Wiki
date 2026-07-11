from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from .errors import Issue
from .models import SourceDocument


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
