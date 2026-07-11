from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from jsonschema import Draft202012Validator, FormatChecker

from .errors import Issue
from .loader import load_json, load_tree
from .models import RepositoryData, SourceDocument
from .page_contracts import discover_page_contracts

DANGEROUS = re.compile(r"<(?:script|iframe|object|embed)\b|javascript\s*:|\bon[a-z]+\s*=", re.I)


@dataclass
class ValidationReport:
    issues: list[Issue]
    data: RepositoryData

    @property
    def errors(self) -> list[Issue]:
        return [issue for issue in self.issues if issue.severity == "error"]

    @property
    def warnings(self) -> list[Issue]:
        return [issue for issue in self.issues if issue.severity == "warning"]

    @property
    def ok(self) -> bool:
        return not self.errors


def _field_path(parts: Iterable[Any]) -> str:
    result = ""
    for part in parts:
        result += f"[{part}]" if isinstance(part, int) else (("." if result else "") + str(part))
    return result


def _walk_strings(value: Any, field: str = "") -> Iterable[tuple[str, str]]:
    if isinstance(value, str):
        yield field, value
    elif isinstance(value, dict):
        for key, child in value.items():
            yield from _walk_strings(child, f"{field}.{key}" if field else str(key))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from _walk_strings(child, f"{field}[{index}]")


def validate_question(document: SourceDocument, schema: dict[str, Any], pages: dict[str, Any]) -> list[Issue]:
    data, path = document.data, document.path
    issues: list[Issue] = []
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    for error in sorted(validator.iter_errors(data), key=lambda item: list(item.absolute_path)):
        issues.append(Issue.error(path, _field_path(error.absolute_path), error.message))
    question_id = data.get("id")
    if isinstance(question_id, str) and "fixtures" not in path.parts and path.stem != question_id:
        issues.append(Issue.error(path, "id", f"file name must be {question_id}.yml"))
    for field, text in _walk_strings(data):
        if DANGEROUS.search(text):
            issues.append(Issue.error(path, field, "raw dangerous HTML or URL is forbidden"))
        if any(ord(character) < 32 and character not in "\n\r\t" for character in text):
            issues.append(Issue.error(path, field, "control characters are forbidden"))
    primary = data.get("primary_objective")
    secondary = data.get("secondary_objectives", [])
    if primary in secondary:
        issues.append(Issue.error(path, "secondary_objectives", "must not repeat primary_objective"))
    scoped_pages = data.get("scope", {}).get("pages", []) if isinstance(data.get("scope"), dict) else []
    if len(scoped_pages) == 1 and scoped_pages[0] in pages:
        page = pages[scoped_pages[0]]
        for field, objective in [("primary_objective", primary), *[(f"secondary_objectives[{i}]", item) for i, item in enumerate(secondary)]]:
            if objective not in page.objectives:
                issues.append(Issue.error(path, field, f"unknown objective for page {page.page_id}"))
    elif scoped_pages:
        issues.append(Issue.error(path, "scope.pages", f"unknown page id {scoped_pages[0]!r}"))
    choices = data.get("choices", [])
    if isinstance(choices, list):
        ids = [choice.get("id") for choice in choices if isinstance(choice, dict)]
        if len(ids) != len(set(ids)):
            issues.append(Issue.error(path, "choices", "choice ids must be unique"))
        answer = data.get("answer", {})
        selected = [answer.get("choice")] if "choice" in answer else answer.get("choices", [])
        for item in selected:
            if item not in ids:
                issues.append(Issue.error(path, "answer", f"choice {item!r} does not exist"))
        feedback_keys = set(data.get("feedback", {}).get("choices", {}))
        if data.get("type") in {"single_choice", "multiple_choice"} and feedback_keys != set(ids):
            issues.append(Issue.error(path, "feedback.choices", "feedback keys must exactly match choice ids"))
    if data.get("type") == "numeric" and isinstance(data.get("answer"), dict):
        answer = data["answer"]
        value = answer.get("value")
        tolerance = answer.get("tolerance", {})
        unit = answer.get("unit", {})
        if isinstance(value, (int, float)) and not math.isfinite(value):
            issues.append(Issue.error(path, "answer.value", "must be finite"))
        if value == 0 and tolerance.get("type") == "relative":
            issues.append(Issue.error(path, "answer.tolerance.type", "zero answers require absolute tolerance"))
        accepted = unit.get("accepted", [])
        if unit.get("required") and (not unit.get("canonical") or unit.get("canonical") not in accepted):
            issues.append(Issue.error(path, "answer.unit", "required canonical unit must appear in accepted units"))
    return issues


def validate_blueprint(document: SourceDocument, schema: dict[str, Any], pages: dict[str, Any]) -> list[Issue]:
    data, path = document.data, document.path
    issues: list[Issue] = []
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    for error in sorted(validator.iter_errors(data), key=lambda item: list(item.absolute_path)):
        issues.append(Issue.error(path, _field_path(error.absolute_path), error.message))
    if not isinstance(data.get("id"), str) or data["id"].rsplit(".", 1)[-1] != path.stem:
        issues.append(Issue.error(path, "id", "blueprint file name must match the final id segment"))
    page = pages.get(data.get("page_id"))
    if not page:
        issues.append(Issue.error(path, "page_id", "unknown page id"))
    elif page.quiz.get("blueprint") != data.get("id"):
        issues.append(Issue.error(path, "id", "page quiz configuration references a different blueprint"))
    for mode_name, mode in data.get("modes", {}).items():
        slots = mode.get("slots", [])
        if sum(slot.get("count", 0) for slot in slots) != mode.get("total"):
            issues.append(Issue.error(path, f"modes.{mode_name}.total", "must equal the sum of slot counts"))
        seen: set[str] = set()
        for index, slot in enumerate(slots):
            for objective in slot.get("objectives", []):
                if objective in seen:
                    issues.append(Issue.error(path, f"modes.{mode_name}.slots[{index}].objectives", "objectives may not occur in more than one slot"))
                seen.add(objective)
                if page and objective not in page.objectives:
                    issues.append(Issue.error(path, f"modes.{mode_name}.slots[{index}].objectives", f"unknown objective {objective}"))
    return issues


def validate_repository(root: Path | str = ".", *, release: bool = False) -> ValidationReport:
    root = Path(root).resolve()
    pages, issues = discover_page_contracts(root)
    questions, question_load_issues = load_tree(root / "question-bank" / "questions")
    blueprints, blueprint_load_issues = load_tree(root / "question-bank" / "blueprints")
    issues.extend(question_load_issues)
    issues.extend(blueprint_load_issues)
    question_schema = load_json(root / "question-bank" / "schemas" / "question.schema.json")
    blueprint_schema = load_json(root / "question-bank" / "schemas" / "blueprint.schema.json")
    ids: Counter[str] = Counter(str(item.data.get("id")) for item in questions)
    blueprint_ids: Counter[str] = Counter(str(item.data.get("id")) for item in blueprints)
    for document in questions:
        issues.extend(validate_question(document, question_schema, pages))
        if ids[str(document.data.get("id"))] > 1:
            issues.append(Issue.error(document.path, "id", "duplicate question id"))
    for document in blueprints:
        issues.extend(validate_blueprint(document, blueprint_schema, pages))
        if blueprint_ids[str(document.data.get("id"))] > 1:
            issues.append(Issue.error(document.path, "id", "duplicate blueprint id"))
    normalized_stems: dict[tuple[str, str], Path] = {}
    for document in questions:
        page_ids = document.data.get("scope", {}).get("pages", [])
        stem = re.sub(r"\s+", " ", str(document.data.get("stem", "")).strip()).casefold()
        if page_ids and stem:
            key = (page_ids[0], stem)
            if key in normalized_stems:
                issues.append(Issue.error(document.path, "stem", f"duplicates {normalized_stems[key]}"))
            normalized_stems[key] = document.path
    published = [item for item in questions if item.data.get("status") == "published"]
    for page in pages.values():
        if not page.quiz.get("enabled"):
            continue
        page_questions = [item for item in published if page.page_id in item.data.get("scope", {}).get("pages", [])]
        counts = Counter(item.data.get("primary_objective") for item in page_questions)
        readiness = len(page_questions) >= 24 and all(counts[objective] >= 4 for objective in page.objectives)
        if not readiness:
            factory = Issue.error if release else Issue.warning
            issues.append(factory(page.path, "quiz", f"construction state: {len(page_questions)}/24 published; each objective requires 4"))
    data = RepositoryData(root=root, questions=questions, blueprints=blueprints, pages=pages)
    return ValidationReport(sorted(set(issues)), data)
