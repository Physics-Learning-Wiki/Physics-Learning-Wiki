from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from jsonschema import Draft202012Validator, FormatChecker

from .errors import Issue
from .loader import load_json, load_taxonomy, load_tree
from .media import question_content_fingerprint, validate_assets
from .models import PageRegistry, RepositoryData, SourceDocument, TaxonomyRegistry
from .page_contracts import build_page_registry, discover_page_contracts, validate_page_contracts
from .selection import solve_query_selection

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


def validate_question_content(
    document: SourceDocument,
    schema: dict[str, Any],
    root: Path | None = None,
) -> list[Issue]:
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
    if root is not None:
        issues.extend(validate_assets(data, path, root))
        if data.get("status") == "published" and isinstance(data.get("review"), dict):
            current_fingerprint = question_content_fingerprint(data, root)
            current_version = data.get("version")
            for dimension in ("physics", "pedagogy", "copyright"):
                attestations = data["review"].get(dimension, [])
                if not any(
                    isinstance(item, dict)
                    and item.get("question_version") == current_version
                    and item.get("content_fingerprint") == current_fingerprint
                    for item in attestations
                ):
                    issues.append(
                        Issue.error(
                            path,
                            f"review.{dimension}",
                            "requires an attestation for the current version and content fingerprint",
                        )
                    )
    return issues


def validate_question_references(
    document: SourceDocument,
    pages: dict[str, Any] | PageRegistry,
    taxonomy: TaxonomyRegistry | None = None,
) -> list[Issue]:
    data, path = document.data, document.path
    issues: list[Issue] = []
    page_registry = pages if isinstance(pages, PageRegistry) else build_page_registry(pages)[0]
    status = data.get("status", "draft")

    if taxonomy is not None:
        for idx, top in enumerate(data.get("topics", [])):
            if not taxonomy.is_valid_topic(top):
                factory = Issue.error if status == "published" else Issue.warning
                issues.append(factory(path, f"topics[{idx}]", f"unknown topic id {top!r}"))
        for idx, con in enumerate(data.get("concepts", [])):
            if not taxonomy.is_valid_concept(con):
                factory = Issue.error if status == "published" else Issue.warning
                issues.append(factory(path, f"concepts[{idx}]", f"unknown concept id {con!r}"))
    for idx, obj in enumerate(data.get("objectives", [])):
        if not page_registry.get_page_for_objective(obj):
            factory = Issue.error if status == "published" else Issue.warning
            issues.append(factory(path, f"objectives[{idx}]", f"unknown objective id {obj!r}"))
    for idx, page_id in enumerate(data.get("related_pages", [])):
        if not page_registry.has_page(page_id):
            factory = Issue.error if status == "published" else Issue.warning
            issues.append(factory(path, f"related_pages[{idx}]", f"unknown related page id {page_id!r}"))

    return issues


def validate_question(
    document: SourceDocument,
    schema: dict[str, Any],
    pages: dict[str, Any] | PageRegistry,
    root: Path | None = None,
    taxonomy: TaxonomyRegistry | None = None,
) -> list[Issue]:
    issues = validate_question_content(document, schema, root)
    issues.extend(validate_question_references(document, pages, taxonomy))
    return issues


def validate_set(
    document: SourceDocument,
    schema: dict[str, Any],
    questions: dict[str, dict[str, Any]],
    taxonomy: TaxonomyRegistry,
    page_registry: PageRegistry | None = None,
) -> list[Issue]:
    data, path = document.data, document.path
    issues: list[Issue] = []
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    for error in sorted(validator.iter_errors(data), key=lambda item: list(item.absolute_path)):
        issues.append(Issue.error(path, _field_path(error.absolute_path), error.message))

    set_id = data.get("id")
    set_status = data.get("status", "draft")
    selection = data.get("selection", {})
    sel_type = selection.get("type")

    # Fixed selection validation
    if sel_type == "fixed":
        q_ids = selection.get("questions", [])
        if len(q_ids) != len(set(q_ids)):
            issues.append(Issue.error(path, "selection.questions", "question ids must be unique"))
        for idx, q_id in enumerate(q_ids):
            if q_id not in questions:
                issues.append(Issue.error(path, f"selection.questions[{idx}]", f"unknown question id {q_id!r}"))
            else:
                q_data = questions[q_id]
                q_status = q_data.get("status")
                if q_status == "retired":
                    issues.append(Issue.error(path, f"selection.questions[{idx}]", f"referenced question {q_id!r} is retired"))
                elif set_status == "published" and q_status != "published":
                    issues.append(Issue.error(path, f"selection.questions[{idx}]", f"published set cannot reference draft question {q_id!r}"))

    # Query selection validation
    elif sel_type == "query":
        count = selection.get("count", 0)
        slots = selection.get("slots", [])
        constraints = selection.get("constraints", [])

        slot_total = sum(s.get("count", 0) for s in slots)
        if slot_total > count:
            issues.append(Issue.error(path, "selection.slots", f"sum of slot counts ({slot_total}) exceeds selection count ({count})"))

        slot_ids: set[str] = set()
        for s_idx, slot in enumerate(slots):
            sid = slot.get("id")
            if sid in slot_ids:
                issues.append(Issue.error(path, f"selection.slots[{s_idx}].id", f"duplicate slot id {sid!r}"))
            slot_ids.add(sid)

        for c_idx, c in enumerate(constraints):
            c_min = c.get("min")
            c_max = c.get("max")
            if c_min is not None and c_max is not None and c_min > c_max:
                issues.append(Issue.error(path, f"selection.constraints[{c_idx}]", "min must not exceed max"))
            if c_max is not None and c_max > count:
                issues.append(Issue.error(path, f"selection.constraints[{c_idx}].max", "max exceeds selection count"))

        def check_filters(filters: dict[str, Any], field_prefix: str) -> None:
            if "topics" in filters:
                t_crit = filters["topics"]
                t_list = t_crit.get("any") or t_crit.get("all") or []
                for t in t_list:
                    if not taxonomy.is_valid_topic(t):
                        factory = Issue.error if set_status == "published" else Issue.warning
                        issues.append(factory(path, f"{field_prefix}.topics", f"unknown topic id {t!r}"))
            if "concepts" in filters:
                c_crit = filters["concepts"]
                c_list = c_crit.get("any") or c_crit.get("all") or []
                for c in c_list:
                    if not taxonomy.is_valid_concept(c):
                        factory = Issue.error if set_status == "published" else Issue.warning
                        issues.append(factory(path, f"{field_prefix}.concepts", f"unknown concept id {c!r}"))
            if "objectives" in filters and page_registry:
                o_crit = filters["objectives"]
                o_list = o_crit.get("any") or o_crit.get("all") or []
                for o in o_list:
                    if not page_registry.get_page_for_objective(o):
                        factory = Issue.error if set_status == "published" else Issue.warning
                        issues.append(factory(path, f"{field_prefix}.objectives", f"unknown objective id {o!r}"))
            if "related_pages" in filters and page_registry:
                p_crit = filters["related_pages"]
                p_list = p_crit.get("any") or p_crit.get("all") or []
                for p_id in p_list:
                    if not page_registry.has_page(p_id):
                        factory = Issue.error if set_status == "published" else Issue.warning
                        issues.append(factory(path, f"{field_prefix}.related_pages", f"unknown page id {p_id!r}"))

        check_filters(selection.get("filters", {}), "selection.filters")
        for s_idx, slot in enumerate(slots):
            check_filters(slot.get("filters", {}), f"selection.slots[{s_idx}].filters")

        if set_status == "published":
            pool = [q for q in questions.values() if q.get("status") == "published"]
        else:
            pool = [q for q in questions.values() if q.get("status") in {"published", "draft"}]

        solution = solve_query_selection(pool, selection, taxonomy, set_id=str(set_id))
        if solution is None:
            factory = Issue.error if set_status == "published" else Issue.warning
            issues.append(factory(path, "selection", "no candidate question set satisfies all selection slots and constraints"))

    return issues


def validate_repository(
    root: Path | str = ".",
    *,
    release: bool = False,
    include_drafts: bool = False,
) -> ValidationReport:
    root = Path(root).resolve()
    pages, issues = discover_page_contracts(root)
    page_registry, registry_issues = build_page_registry(pages)
    issues.extend(registry_issues)

    questions, question_load_issues = load_tree(root / "question-bank" / "questions")
    issues.extend(question_load_issues)

    sets, set_load_issues = load_tree(root / "question-bank" / "sets")
    issues.extend(set_load_issues)

    taxonomy_path = root / "question-bank" / "taxonomy"
    taxonomy, tax_issues = load_taxonomy(taxonomy_path) if taxonomy_path.exists() else (TaxonomyRegistry(), [])
    issues.extend(tax_issues)

    question_schema = load_json(root / "question-bank" / "schemas" / "question.schema.json")
    set_schema = load_json(root / "question-bank" / "schemas" / "set.schema.json")

    ids: Counter[str] = Counter(str(item.data.get("id")) for item in questions)
    for document in questions:
        issues.extend(validate_question(document, question_schema, page_registry, root, taxonomy))
        if ids[str(document.data.get("id"))] > 1:
            issues.append(Issue.error(document.path, "id", "duplicate question id"))

    normalized_stems: dict[str, Path] = {}
    for document in questions:
        stem = re.sub(r"\s+", " ", str(document.data.get("stem", "")).strip()).casefold()
        if stem:
            if stem in normalized_stems:
                issues.append(Issue.error(document.path, "stem", f"duplicates {normalized_stems[stem]}"))
            normalized_stems[stem] = document.path

    questions_by_id = {str(item.data.get("id")): item.data for item in questions}
    set_ids: Counter[str] = Counter(str(item.data.get("id")) for item in sets)
    sets_by_id = {str(item.data.get("id")): item for item in sets}

    for document in sets:
        issues.extend(validate_set(document, set_schema, questions_by_id, taxonomy, page_registry))
        if set_ids[str(document.data.get("id"))] > 1:
            issues.append(Issue.error(document.path, "id", "duplicate set id"))

    for page in pages.values():
        for idx, placement in enumerate(page.assessments):
            set_doc = sets_by_id.get(placement.set_id)
            if not set_doc:
                issues.append(Issue.error(page.path, f"assessments[{idx}].set", f"unknown set id {placement.set_id!r}"))
            else:
                set_status = set_doc.data.get("status")
                if set_status == "retired":
                    issues.append(Issue.error(page.path, f"assessments[{idx}].set", f"referenced set {placement.set_id!r} is retired"))
                elif set_status == "draft":
                    issues.append(Issue.warning(page.path, f"assessments[{idx}].set", f"page references draft set {placement.set_id!r}"))

    data = RepositoryData(
        root=root,
        questions=questions,
        sets=sets,
        pages=pages,
        page_registry=page_registry,
        taxonomy=taxonomy,
    )
    return ValidationReport(sorted(set(issues)), data)
