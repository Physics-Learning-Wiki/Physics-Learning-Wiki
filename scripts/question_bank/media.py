from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import Any, Iterable

from .errors import Issue
from .utils import fingerprint

ASSET_REF_RE = re.compile(r"!\[([^\]]*)\]\(asset:([a-z][a-z0-9-]{0,31})\)")
MAX_ASSET_BYTES = 1024 * 1024
MAX_QUESTION_ASSET_BYTES = 3 * 1024 * 1024
ALLOWED_EXTENSIONS = {".svg", ".png", ".webp"}
SVG_DANGEROUS_RE = re.compile(
    rb"<(?:script|foreignObject|iframe|object|embed)\b|(?:href|xlink:href)\s*=\s*[\"'](?:https?:|//|data:)|\bon[a-z]+\s*=",
    re.I,
)


def iter_question_strings(data: dict[str, Any]) -> Iterable[tuple[str, str]]:
    for field in ("stem", "solution"):
        value = data.get(field)
        if isinstance(value, str):
            yield field, value
    for index, value in enumerate(data.get("hints", [])):
        if isinstance(value, str):
            yield f"hints[{index}]", value
    for index, choice in enumerate(data.get("choices", [])):
        if isinstance(choice, dict) and isinstance(choice.get("content"), str):
            yield f"choices[{index}].content", choice["content"]
    feedback = data.get("feedback", {})
    if isinstance(feedback, dict):
        for key, value in feedback.items():
            if isinstance(value, str):
                yield f"feedback.{key}", value
            elif isinstance(value, dict):
                for child_key, child in value.items():
                    if isinstance(child, str):
                        yield f"feedback.{key}.{child_key}", child


def asset_source(root: Path, relative: str) -> Path | None:
    base = (root / "question-bank" / "assets").resolve()
    candidate = (base / relative).resolve()
    try:
        candidate.relative_to(base)
    except ValueError:
        return None
    return candidate


def question_content_fingerprint(data: dict[str, Any], root: Path) -> str:
    payload = {key: value for key, value in data.items() if key not in {"status", "review", "submission"}}
    asset_bytes: dict[str, str] = {}
    for asset in data.get("assets", []):
        if not isinstance(asset, dict) or not isinstance(asset.get("path"), str):
            continue
        path = asset_source(root, asset["path"])
        if path and path.is_file():
            asset_bytes[str(asset.get("id"))] = hashlib.sha256(path.read_bytes()).hexdigest()
    return fingerprint({"question": payload, "assets": asset_bytes})


def validate_assets(data: dict[str, Any], path: Path, root: Path) -> list[Issue]:
    issues: list[Issue] = []
    assets = data.get("assets", [])
    by_id: dict[str, dict[str, Any]] = {}
    total = 0
    for index, asset in enumerate(assets if isinstance(assets, list) else []):
        if not isinstance(asset, dict):
            continue
        asset_id = asset.get("id")
        relative = asset.get("path")
        if not isinstance(asset_id, str) or not isinstance(relative, str):
            continue
        if asset_id in by_id:
            issues.append(Issue.error(path, f"assets[{index}].id", "asset ids must be unique"))
        by_id[asset_id] = asset
        source = asset_source(root, relative)
        if source is None:
            issues.append(Issue.error(path, f"assets[{index}].path", "asset path escapes question-bank/assets"))
            continue
        if source.suffix.lower() not in ALLOWED_EXTENSIONS:
            issues.append(Issue.error(path, f"assets[{index}].path", "unsupported asset extension"))
            continue
        if not source.is_file():
            issues.append(Issue.error(path, f"assets[{index}].path", "asset file does not exist"))
            continue
        content = source.read_bytes()
        total += len(content)
        if len(content) > MAX_ASSET_BYTES:
            issues.append(Issue.error(path, f"assets[{index}].path", "asset exceeds 1 MiB"))
        if source.suffix.lower() == ".png" and not content.startswith(b"\x89PNG\r\n\x1a\n"):
            issues.append(Issue.error(path, f"assets[{index}].path", "PNG signature is invalid"))
        if source.suffix.lower() == ".webp" and not (content.startswith(b"RIFF") and content[8:12] == b"WEBP"):
            issues.append(Issue.error(path, f"assets[{index}].path", "WebP signature is invalid"))
        if source.suffix.lower() == ".svg":
            if b"<svg" not in content[:4096].lower():
                issues.append(Issue.error(path, f"assets[{index}].path", "SVG root is missing"))
            if SVG_DANGEROUS_RE.search(content):
                issues.append(Issue.error(path, f"assets[{index}].path", "SVG contains active or external content"))
    if total > MAX_QUESTION_ASSET_BYTES:
        issues.append(Issue.error(path, "assets", "question assets exceed 3 MiB"))

    referenced: set[str] = set()
    for field, text in iter_question_strings(data):
        for match in ASSET_REF_RE.finditer(text):
            alt, asset_id = match.groups()
            referenced.add(asset_id)
            if not alt.strip():
                issues.append(Issue.error(path, field, f"asset {asset_id} requires non-empty alternative text"))
            if asset_id not in by_id:
                issues.append(Issue.error(path, field, f"unknown asset id {asset_id}"))
    for asset_id in by_id.keys() - referenced:
        issues.append(Issue.warning(path, "assets", f"asset {asset_id} is declared but unused"))
    return issues


def compiled_assets(data: dict[str, Any], root: Path) -> tuple[dict[str, str], dict[str, bytes]]:
    references: dict[str, str] = {}
    files: dict[str, bytes] = {}
    for asset in data.get("assets", []):
        source = asset_source(root, asset["path"])
        if not source or not source.is_file():
            continue
        content = source.read_bytes()
        digest = hashlib.sha256(content).hexdigest()[:16]
        relative = f"assets/{digest}{source.suffix.lower()}"
        references[asset["id"]] = relative
        files[relative] = content
    return references, files
