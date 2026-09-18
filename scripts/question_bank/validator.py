from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass
from itertools import combinations
from pathlib import Path
from typing import Any, Iterable

from jsonschema import Draft202012Validator, FormatChecker

from .errors import Issue
from .loader import load_json, load_tree
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
    page_map = pages.pages if isinstance(pages, PageRegistry) else pages
    status = data.get("status", "draft")

    if data.get("schema_version") == 3:
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
            if not any(obj in page.objectives for page in page_map.values()):
                factory = Issue.error if status == "published" else Issue.warning
                issues.append(factory(path, f"objectives[{idx}]", f"unknown objective id {obj!r}"))
        for idx, page_id in enumerate(data.get("related_pages", [])):
            if page_id not in page_map:
                factory = Issue.error if status == "published" else Issue.warning
                issues.append(factory(path, f"related_pages[{idx}]", f"unknown related page id {page_id!r}"))

    primary = data.get("primary_objective")
    secondary = data.get("secondary_objectives", [])
    if primary in secondary:
        issues.append(Issue.error(path, "secondary_objectives", "must not repeat primary_objective"))
    scoped_pages = data.get("scope", {}).get("pages", []) if isinstance(data.get("scope"), dict) else []
    if len(scoped_pages) == 1 and scoped_pages[0] in page_map:
        page = page_map[scoped_pages[0]]
        for field, objective in [("primary_objective", primary), *[(f"secondary_objectives[{i}]", item) for i, item in enumerate(secondary)]]:
            if objective not in page.objectives:
                issues.append(Issue.error(path, field, f"unknown objective for page {page.page_id}"))
    elif scoped_pages:
        issues.append(Issue.error(path, "scope.pages", f"unknown page id {scoped_pages[0]!r}"))
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
        for index, constraint in enumerate(mode.get("constraints", [])):
            minimum = constraint.get("min", 0)
            maximum = constraint.get("max", mode.get("total", 0))
            if minimum > maximum:
                issues.append(Issue.error(path, f"modes.{mode_name}.constraints[{index}]", "min must not exceed max"))
            if maximum > mode.get("total", 0):
                issues.append(Issue.error(path, f"modes.{mode_name}.constraints[{index}].max", "max exceeds mode total"))
    return issues


def publication_readiness(page: Any, questions: list[dict[str, Any]], blueprint: dict[str, Any]) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    if len(questions) < 24:
        reasons.append(f"{len(questions)}/24 published")
    for objective in page.objectives:
        objective_questions = [item for item in questions if item.get("primary_objective") == objective]
        if len(objective_questions) < 4:
            reasons.append(f"{objective}: {len(objective_questions)}/4")
        if objective_questions and not any(item.get("style") == "conceptual" for item in objective_questions):
            reasons.append(f"{objective}: missing conceptual question")
        if objective_questions and not any(item.get("style") in {"computational", "modeling"} or item.get("cognitive_level") in {"apply", "analyze"} for item in objective_questions):
            reasons.append(f"{objective}: missing application/modeling question")
    if not blueprint:
        reasons.append("blueprint is missing")
    else:
        for mode_name, mode in blueprint.get("modes", {}).items():
            for slot in mode.get("slots", []):
                candidates = [item for item in questions if item.get("primary_objective") in slot.get("objectives", [])]
                if len(candidates) < slot.get("count", 0):
                    reasons.append(f"blueprint {mode_name}.{slot.get('id')}: {len(candidates)}/{slot.get('count')} candidates")
    return not reasons, reasons


def _satisfies_constraints(questions: list[dict[str, Any]], mode: dict[str, Any]) -> bool:
    for constraint in mode.get("constraints", []):
        count = sum(item.get(constraint.get("field")) in constraint.get("values", []) for item in questions)
        if count < constraint.get("min", 0) or count > constraint.get("max", mode.get("total", 0)):
            return False
    return True


def blueprint_mode_feasible(questions: list[dict[str, Any]], mode: dict[str, Any]) -> bool:
    slots = mode.get("slots", [])

    def search(index: int, selected: list[dict[str, Any]], selected_ids: set[str]) -> bool:
        if index == len(slots):
            return _satisfies_constraints(selected, mode)
        slot = slots[index]
        candidates = [
            item
            for item in questions
            if item.get("primary_objective") in slot.get("objectives", [])
            and item.get("id") not in selected_ids
        ]
        for chosen in combinations(candidates, slot.get("count", 0)):
            next_selected = [*selected, *chosen]
            next_ids = selected_ids | {str(item.get("id")) for item in chosen}
            if search(index + 1, next_selected, next_ids):
                return True
        return False

    return search(0, [], set())


def validate_repository(root: Path | str = ".", *, release: bool = False, include_drafts: bool = False) -> ValidationReport:
    root = Path(root).resolve()
    pages, issues = discover_page_contracts(root)
    page_registry, registry_issues = build_page_registry(pages)
    issues.extend(registry_issues)
    questions, question_load_issues = load_tree(root / "question-bank" / "questions")
    blueprints, blueprint_load_issues = load_tree(root / "question-bank" / "blueprints")
    issues.extend(question_load_issues)
    issues.extend(blueprint_load_issues)
    question_schema = load_json(root / "question-bank" / "schemas" / "question.schema.json")
    blueprint_schema = load_json(root / "question-bank" / "schemas" / "blueprint.schema.json")
    ids: Counter[str] = Counter(str(item.data.get("id")) for item in questions)
    blueprint_ids: Counter[str] = Counter(str(item.data.get("id")) for item in blueprints)
    for document in questions:
        issues.extend(validate_question(document, question_schema, pages, root))
        if ids[str(document.data.get("id"))] > 1:
            issues.append(Issue.error(document.path, "id", "duplicate question id"))
    for document in blueprints:
        issues.extend(validate_blueprint(document, blueprint_schema, pages))
        if blueprint_ids[str(document.data.get("id"))] > 1:
            issues.append(Issue.error(document.path, "id", "duplicate blueprint id"))
    blueprint_by_id = {str(document.data.get("id")): document.data for document in blueprints}
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
        page_questions = [item.data for item in published if page.page_id in item.data.get("scope", {}).get("pages", [])]
        blueprint = blueprint_by_id.get(str(page.quiz.get("blueprint")), {})
        readiness, reasons = publication_readiness(page, page_questions, blueprint)
        state = page.quiz.get("state", "construction")
        if state not in {"construction", "active"}:
            issues.append(Issue.error(page.path, "quiz.state", "must be construction or active"))
        prefix = page.quiz.get("question_prefix")
        if not isinstance(prefix, str) or not re.fullmatch(r"[a-z][a-z0-9-]{3,55}", prefix):
            issues.append(Issue.error(page.path, "quiz.question_prefix", "valid stable question prefix is required"))
        if not readiness:
            factory = Issue.error if state == "active" else Issue.warning
            issues.append(factory(page.path, "quiz", "construction state: " + "; ".join(reasons)))
        elif release and state == "active":
            pass
        candidate_questions = [
            item.data for item in questions
            if (
                page.page_id in item.data.get("scope", {}).get("pages", [])
                and item.data.get("status") == "published"
            ) or (
                include_drafts and page.page_id in item.data.get("scope", {}).get("pages", []) and item.data.get("status") == "draft"
            )
        ]
        if include_drafts and blueprint:
            for mode_name, mode in blueprint.get("modes", {}).items():
                for slot in mode.get("slots", []):
                    count = sum(item.get("primary_objective") in slot.get("objectives", []) for item in candidate_questions)
                    if count < slot.get("count", 0):
                        issues.append(Issue.error(page.path, f"quiz.{mode_name}.{slot.get('id')}", f"preview blueprint requires {slot.get('count')} candidate(s), found {count}"))
                if candidate_questions and not blueprint_mode_feasible(candidate_questions, mode):
                    issues.append(
                        Issue.error(
                            page.path,
                            f"quiz.{mode_name}.constraints",
                            "no candidate set satisfies all blueprint constraints",
                        )
                    )
        if state == "active" and blueprint:
            for mode_name, mode in blueprint.get("modes", {}).items():
                if page_questions and not blueprint_mode_feasible(page_questions, mode):
                    issues.append(
                        Issue.error(
                            page.path,
                            f"quiz.{mode_name}.constraints",
                            "no published question set satisfies all blueprint constraints",
                        )
                    )
    data = RepositoryData(
        root=root,
        questions=questions,
        blueprints=blueprints,
        pages=pages,
        page_registry=page_registry,
    )
    return ValidationReport(sorted(set(issues)), data)
