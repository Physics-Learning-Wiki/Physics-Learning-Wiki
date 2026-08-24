from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path
from typing import Any

import yaml

from .loader import load_tree, load_yaml
from .media import question_content_fingerprint
from .page_contracts import discover_page_contracts
from .validator import validate_repository


def _write_yaml(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        yaml.safe_dump(data, allow_unicode=True, sort_keys=False, width=120),
        encoding="utf-8",
    )


def find_question(root: Path, question_id: str) -> tuple[Path, dict[str, Any]]:
    for document in load_tree(root / "question-bank" / "questions")[0]:
        if document.data.get("id") == question_id:
            return document.path, document.data
    raise ValueError(f"unknown question id {question_id}")


def next_question_id(root: Path, page_id: str) -> tuple[str, Path]:
    pages, issues = discover_page_contracts(root)
    if issues:
        raise ValueError(issues[0].render())
    page = pages.get(page_id)
    if not page:
        raise ValueError(f"unknown page id {page_id}")
    prefix = page.quiz.get("question_prefix")
    if not isinstance(prefix, str):
        raise ValueError(f"page {page_id} has no question_prefix")
    numbers: list[int] = []
    for document in load_tree(root / "question-bank" / "questions")[0]:
        match = re.fullmatch(re.escape(prefix) + r"-(\d{4})", str(document.data.get("id", "")))
        if match:
            numbers.append(int(match.group(1)))
    question_id = f"{prefix}-{max(numbers, default=0) + 1:04d}"
    page_directory = root / "question-bank" / "questions" / Path(*page_id.split("."))
    return question_id, page_directory / f"{question_id}.yml"


def import_issue(root: Path, input_path: Path) -> Path:
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    if payload.get("schemaVersion") != 1 or not isinstance(payload.get("question"), dict):
        raise ValueError("unsupported question submission payload")
    source = payload["question"]
    page_id = source.get("page_id")
    if not isinstance(page_id, str):
        raise ValueError("question.page_id is required")
    question_id, output = next_question_id(root, page_id)
    authors = [{"name": str(source.get("attribution") or "匿名投稿者"), "kind": "human"}]
    if source.get("ai_assisted"):
        authors.append({"name": str(source.get("ai_name") or "未指定 AI 工具"), "kind": "ai"})
    question: dict[str, Any] = {
        "schema_version": 2,
        "id": question_id,
        "version": 1,
        "status": "draft",
        "locale": "zh-CN",
        "scope": {"pages": [page_id]},
        "primary_objective": source.get("primary_objective"),
        "secondary_objectives": source.get("secondary_objectives", []),
        "concepts": source.get("concepts", []),
        "type": source.get("type"),
        "choice_order": source.get("choice_order", "shuffle"),
        "stem": source.get("stem"),
        "answer": source.get("answer"),
        "feedback": source.get("feedback"),
        "solution": source.get("solution"),
        "hints": source.get("hints", []),
        "difficulty": source.get("difficulty"),
        "cognitive_level": source.get("cognitive_level"),
        "style": source.get("style"),
        "estimated_seconds": source.get("estimated_seconds"),
        "provenance": {
            "type": "original",
            "note": "通过 Physics Learning Wiki 结构化投稿表单提交",
            "ai_assisted": bool(source.get("ai_assisted")),
        },
        "authors": authors,
        "license": "CC-BY-SA-4.0",
        "submission": {"issue_url": payload.get("issueUrl")},
    }
    if source.get("choices"):
        question["choices"] = source["choices"]
    external_media = source.get("external_media")
    if external_media:
        question["submission"]["external_media"] = external_media
    _write_yaml(output, question)
    report = validate_repository(root, include_drafts=True)
    errors = [issue for issue in report.errors if issue.path == output]
    if errors:
        output.unlink(missing_ok=True)
        raise ValueError("\n".join(issue.render() for issue in errors))
    return output


def attest(
    root: Path,
    question_id: str,
    dimensions: list[str],
    reviewer: str,
    reviewed_on: str | None = None,
) -> Path:
    path, data = find_question(root, question_id)
    fingerprint = question_content_fingerprint(data, root)
    attestation = {
        "github": reviewer,
        "reviewed_on": reviewed_on or date.today().isoformat(),
        "question_version": data["version"],
        "content_fingerprint": fingerprint,
    }
    review = data.setdefault("review", {})
    for dimension in dimensions:
        if dimension not in {"physics", "pedagogy", "copyright"}:
            raise ValueError(f"unknown review dimension {dimension}")
        existing = [item for item in review.get(dimension, []) if item.get("github") != reviewer]
        review[dimension] = [*existing, attestation.copy()]
    _write_yaml(path, data)
    return path


def publish(root: Path, question_id: str) -> Path:
    path, data = find_question(root, question_id)
    original = data.get("status")
    data["status"] = "published"
    _write_yaml(path, data)
    report = validate_repository(root)
    errors = [issue for issue in report.errors if issue.path == path]
    if errors:
        data["status"] = original
        _write_yaml(path, data)
        raise ValueError("\n".join(issue.render() for issue in errors))
    return path
