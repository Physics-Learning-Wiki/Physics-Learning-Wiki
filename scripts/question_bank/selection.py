from __future__ import annotations

import re
from typing import Any, TypeVar

from .models import TaxonomyRegistry

T = TypeVar("T")

SELECTION_ALGORITHM_VERSION = 1


def _int32(val: int) -> int:
    val = val & 0xFFFFFFFF
    if val >= 0x80000000:
        val -= 0x100000000
    return val


def _uint32(val: int) -> int:
    return val & 0xFFFFFFFF


def _imul(a: int, b: int) -> int:
    return _int32(_int32(a) * _int32(b))


def hash_seed(seed: str) -> int:
    h = 2166136261
    for char in seed:
        h = _uint32(h ^ ord(char))
        h = _uint32(_imul(h, 16777619))
    return h


def create_random(seed: str):
    state = hash_seed(seed)

    def next_float() -> float:
        nonlocal state
        state = _uint32(state + 0x6D2B79F5)
        value = _int32(state)
        v1 = _imul(value ^ (_uint32(value) >> 15), value | 1)
        v2 = _imul(v1 ^ (_uint32(v1) >> 7), v1 | 61)
        value = _int32(v1 ^ _int32(v1 + v2))
        return _uint32(value ^ (_uint32(value) >> 14)) / 4294967296.0

    return next_float


def shuffle(input_list: list[T], seed: str) -> list[T]:
    result = list(input_list)
    rnd = create_random(seed)
    for index in range(len(result) - 1, 0, -1):
        target = int(rnd() * (index + 1))
        result[index], result[target] = result[target], result[index]
    return result


def _matches_any_or_all(item_values: list[str], criterion: dict[str, list[str]]) -> bool:
    if "any" in criterion:
        target_set = set(criterion["any"])
        return any(v in target_set for v in item_values)
    if "all" in criterion:
        target_set = set(criterion["all"])
        return target_set.issubset(set(item_values))
    return True


def matches_filters(
    question: dict[str, Any],
    filters: dict[str, Any],
    taxonomy: TaxonomyRegistry | None = None,
) -> bool:
    if not filters:
        return True

    # 1. Topics
    if "topics" in filters:
        q_topics = question.get("topics")
        if not q_topics or not isinstance(q_topics, list):
            return False
        topic_crit = filters["topics"]
        if "any" in topic_crit:
            expanded: set[str] = set()
            for t in topic_crit["any"]:
                if taxonomy:
                    expanded.update(taxonomy.get_topic_descendants_and_self(t))
                else:
                    expanded.add(t)
            if not any(t in expanded for t in q_topics):
                return False
        elif "all" in topic_crit:
            for t in topic_crit["all"]:
                expanded = taxonomy.get_topic_descendants_and_self(t) if taxonomy else {t}
                if not any(qt in expanded for qt in q_topics):
                    return False

    # 2. Concepts
    if "concepts" in filters:
        q_concepts = question.get("concepts")
        if not q_concepts or not isinstance(q_concepts, list):
            return False
        if not _matches_any_or_all(q_concepts, filters["concepts"]):
            return False

    # 3. Objectives
    if "objectives" in filters:
        q_objs = question.get("objectives")
        if not q_objs or not isinstance(q_objs, list):
            return False
        if not _matches_any_or_all(q_objs, filters["objectives"]):
            return False

    # 4. Related Pages
    if "related_pages" in filters:
        q_pages = question.get("related_pages")
        if not q_pages or not isinstance(q_pages, list):
            return False
        if not _matches_any_or_all(q_pages, filters["related_pages"]):
            return False

    # 5. Types
    if "types" in filters:
        q_type = question.get("type")
        if q_type not in filters["types"]:
            return False

    # 6. Cognitive Levels
    if "cognitive_levels" in filters:
        q_cog = question.get("cognitive_level")
        if q_cog not in filters["cognitive_levels"]:
            return False

    # 7. Styles
    if "styles" in filters:
        q_style = question.get("style")
        if q_style not in filters["styles"]:
            return False

    # 8. Question IDs
    if "question_ids" in filters:
        q_id = question.get("id")
        if q_id not in filters["question_ids"]:
            return False

    # 9. Difficulty
    if "difficulty" in filters:
        q_diff = question.get("difficulty")
        if q_diff is None or not isinstance(q_diff, int):
            return False
        diff_crit = filters["difficulty"]
        min_diff = diff_crit.get("min")
        max_diff = diff_crit.get("max")
        if min_diff is not None and q_diff < min_diff:
            return False
        if max_diff is not None and q_diff > max_diff:
            return False

    return True


def satisfies_constraints(selected: list[dict[str, Any]], constraints: list[dict[str, Any]]) -> bool:
    for c in constraints:
        field = c.get("field")
        values = c.get("values", [])
        min_val = c.get("min")
        max_val = c.get("max")

        matching_count = sum(1 for q in selected if q.get(field) in values)
        if min_val is not None and matching_count < min_val:
            return False
        if max_val is not None and matching_count > max_val:
            return False
    return True


def solve_query_selection(
    pool: list[dict[str, Any]],
    query: dict[str, Any],
    taxonomy: TaxonomyRegistry | None = None,
    seed: str | None = None,
    set_id: str = "",
) -> list[dict[str, Any]] | None:
    count = query.get("count", 0)
    top_filters = query.get("filters", {})
    slots = query.get("slots", [])
    constraints = query.get("constraints", [])

    # Step 1: Filter pool by top-level filters and sort by id
    p_pool = [q for q in pool if matches_filters(q, top_filters, taxonomy)]
    p_pool.sort(key=lambda q: str(q.get("id", "")))

    if len(p_pool) < count:
        return None

    # Step 2: Slot candidates
    slot_candidates: list[list[dict[str, Any]]] = []
    for s in slots:
        cands = [q for q in p_pool if matches_filters(q, s.get("filters", {}), taxonomy)]
        if seed is not None:
            cands = shuffle(cands, f"{set_id}:slot:{s.get('id')}:{seed}")
        slot_candidates.append(cands)

    total_slot_count = sum(s.get("count", 0) for s in slots)
    if total_slot_count > count:
        return None

    # Step 3: Backtracking search
    assigned_slots: list[list[dict[str, Any]]] = []
    used_ids: set[str] = set()

    def search_slots(slot_idx: int) -> list[dict[str, Any]] | None:
        if slot_idx == len(slots):
            # All slots filled, now fill remaining questions from remaining pool
            remaining_needed = count - len(used_ids)
            remaining_cands = [q for q in p_pool if str(q.get("id")) not in used_ids]
            if len(remaining_cands) < remaining_needed:
                return None
            if seed is not None:
                remaining_cands = shuffle(remaining_cands, f"{set_id}:pool:{seed}")

            # Search combination of remaining candidates that satisfies constraints
            flattened_slots = [q for sublist in assigned_slots for q in sublist]
            return search_remaining(0, remaining_needed, remaining_cands, flattened_slots)

        slot = slots[slot_idx]
        slot_need = slot.get("count", 0)
        cands = [q for q in slot_candidates[slot_idx] if str(q.get("id")) not in used_ids]
        if len(cands) < slot_need:
            return None

        from itertools import combinations

        for chosen in combinations(cands, slot_need):
            chosen_ids = {str(q.get("id")) for q in chosen}
            used_ids.update(chosen_ids)
            assigned_slots.append(list(chosen))

            result = search_slots(slot_idx + 1)
            if result is not None:
                return result

            assigned_slots.pop()
            used_ids.difference_update(chosen_ids)

        return None

    def search_remaining(
        start_idx: int, needed: int, candidates: list[dict[str, Any]], current_selection: list[dict[str, Any]]
    ) -> list[dict[str, Any]] | None:
        if needed == 0:
            if satisfies_constraints(current_selection, constraints):
                return list(current_selection)
            return None

        from itertools import combinations

        for chosen in combinations(candidates, needed):
            trial = current_selection + list(chosen)
            if satisfies_constraints(trial, constraints):
                return trial

        return None

    solution = search_slots(0)
    if solution is None:
        return None

    # If seed is provided, finalize question and choices shuffle
    if seed is not None:
        final_questions = shuffle(solution, f"{set_id}:order:{seed}")
        result_questions: list[dict[str, Any]] = []
        for q in final_questions:
            q_copy = dict(q)
            if q_copy.get("choice_order") == "shuffle" and "choices" in q_copy and isinstance(q_copy["choices"], list):
                q_copy["choices"] = shuffle(q_copy["choices"], f"{set_id}:{q_copy['id']}:choices:{seed}")
            result_questions.append(q_copy)
        return result_questions

    return solution
