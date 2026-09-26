from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path
from typing import Any

import yaml

from .loader import load_tree, load_yaml
from .media import question_content_fingerprint
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


def next_question_id(root: Path) -> tuple[str, Path]:
    questions_root = root / "question-bank" / "questions"
    numbers: list[int] = []
    if questions_root.exists():
        for path in questions_root.rglob("*.yml"):
            match = re.fullmatch(r"q-(\d{6})", path.stem)
            if match:
                numbers.append(int(match.group(1)))
    next_num = max(numbers, default=0) + 1
    new_id = f"q-{next_num:06d}"
    inbox_dir = questions_root / "inbox"
    return new_id, inbox_dir / f"{new_id}.yml"


ALLOWED_SUBMISSION_QUESTION_KEYS = {
    "type",
    "choice_order",
    "stem",
    "solution",
    "answer",
    "response",
    "grading",
    "reference_answer",
    "choices",
    "feedback",
    "hints",
    "difficulty",
    "cognitive_level",
    "style",
    "estimated_seconds",
    "topics",
    "concepts",
    "objectives",
    "related_pages",
    "external_media",
    "attribution",
    "ai_assisted",
    "ai_name",
}


def import_issue(root: Path, input_path: Path) -> Path:
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    if payload.get("schemaVersion") != 2 or not isinstance(payload.get("question"), dict):
        raise ValueError("unsupported question submission payload")
    source = payload["question"]
    unknown_keys = set(source.keys()) - ALLOWED_SUBMISSION_QUESTION_KEYS
    if unknown_keys:
        raise ValueError(f"submission question contains unknown properties: {', '.join(sorted(unknown_keys))}")
    question_id, output = next_question_id(root)
    authors = [{"name": str(source.get("attribution") or "匿名投稿者"), "kind": "human"}]
    if source.get("ai_assisted"):
        authors.append({"name": str(source.get("ai_name") or "未指定 AI 工具"), "kind": "ai"})
    question: dict[str, Any] = {
        "schema_version": 3,
        "id": question_id,
        "version": 1,
        "status": "draft",
        "locale": "zh-CN",
        "type": source.get("type"),
        "choice_order": source.get(
            "choice_order",
            "shuffle" if source.get("type") in {"single_choice", "multiple_choice"} else "fixed",
        ),
        "stem": source.get("stem"),
        "solution": source.get("solution"),
        "provenance": {
            "type": "original",
            "note": "通过 Physics Learning Wiki 结构化投稿表单提交",
            "ai_assisted": bool(source.get("ai_assisted")),
        },
        "authors": authors,
        "license": "CC-BY-SA-4.0",
    }
    if source.get("type") != "free_response":
        question["answer"] = source.get("answer")
    else:
        question["response"] = source.get("response")
        question["grading"] = source.get("grading")
        question["reference_answer"] = source.get("reference_answer")
    for field in ("topics", "concepts", "objectives", "related_pages", "choices", "feedback", "hints"):
        if source.get(field):
            question[field] = source[field]
    for field in ("difficulty", "cognitive_level", "style", "estimated_seconds"):
        if source.get(field) is not None:
            question[field] = source[field]

    submission_meta: dict[str, Any] = {}
    if payload.get("issueUrl"):
        submission_meta["issue_url"] = payload.get("issueUrl")
    if source.get("external_media"):
        submission_meta["external_media"] = source["external_media"]
    if submission_meta:
        question["submission"] = submission_meta

    _write_yaml(output, question)
    report = validate_repository(root, include_drafts=True)
    errors = [issue for issue in report.errors if Path(issue.path) == Path(output)]
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


def find_set(root: Path, set_id: str) -> tuple[Path, dict[str, Any]]:
    for document in load_tree(root / "question-bank" / "sets")[0]:
        if document.data.get("id") == set_id:
            return document.path, document.data
    raise ValueError(f"unknown question or set id {set_id}")


def publish(root: Path, resource_id: str) -> Path:
    is_set = False
    try:
        path, data = find_question(root, resource_id)
    except ValueError:
        path, data = find_set(root, resource_id)
        is_set = True

    original = data.get("status")
    data["status"] = "published"
    _write_yaml(path, data)
    try:
        report = validate_repository(root)
        errors = [issue for issue in report.errors if issue.path == path]
        if errors:
            raise ValueError("\n".join(issue.render() for issue in errors))

        if is_set:
            from .coverage import coverage_data

            cov = coverage_data(report, preview=False)
            target_set = cov.get("sets", {}).get(resource_id)
            if not target_set or not target_set.get("feasible"):
                raise ValueError(f"set {resource_id} is not feasible with currently published questions")
    except Exception:
        data["status"] = original
        _write_yaml(path, data)
        raise

    return path
