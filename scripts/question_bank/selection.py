from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations
import re
from typing import Any, Literal, TypeVar

from .models import TaxonomyRegistry

T = TypeVar("T")

SELECTION_ALGORITHM_VERSION = 1


@dataclass
class SelectionResult:
    status: Literal["ok", "infeasible", "exhausted"]
    questions: list[dict[str, Any]] | None = None
    reason_code: str | None = None
    message: str | None = None

    @property
    def is_ok(self) -> bool:
        return self.status == "ok"


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
    for byte in seed.encode("utf-8"):
        h = _uint32(h ^ byte)
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


def can_satisfy_constraints(
    selected: list[dict[str, Any]],
    remaining_count: int,
    constraints: list[dict[str, Any]],
) -> bool:
    for c in constraints:
        field = c.get("field")
        values = c.get("values", [])
        min_val = c.get("min")
        max_val = c.get("max")
        matching = sum(1 for q in selected if q.get(field) in values)
        if max_val is not None and matching > max_val:
            return False
        if min_val is not None and matching + remaining_count < min_val:
            return False
    return True


def solve_query_selection_detailed(
    pool: list[dict[str, Any]],
    query: dict[str, Any],
    taxonomy: TaxonomyRegistry | None = None,
    seed: str | None = None,
    set_id: str = "",
) -> SelectionResult:
    count = query.get("count", 0)
    top_filters = query.get("filters", {})
    slots = query.get("slots", [])
    constraints = query.get("constraints", [])

    # Step 1: Filter pool by top-level filters and sort by id
    p_pool = [q for q in pool if matches_filters(q, top_filters, taxonomy)]
    p_pool.sort(key=lambda q: str(q.get("id", "")))

    if len(p_pool) < count:
        return SelectionResult(
            status="infeasible",
            reason_code="insufficient_pool",
            message=f"候选题目池数量不足（需要 {count} 道，当前仅有 {len(p_pool)} 道）",
        )

    # Step 2: Slot candidates
    slot_candidates: list[list[dict[str, Any]]] = []
    for s in slots:
        cands = [q for q in p_pool if matches_filters(q, s.get("filters", {}), taxonomy)]
        if seed is not None:
            cands = shuffle(cands, f"{set_id}:slot:{s.get('id')}:{seed}")
        slot_candidates.append(cands)

    total_slot_count = sum(s.get("count", 0) for s in slots)
    if total_slot_count > count:
        return SelectionResult(
            status="infeasible",
            reason_code="slot_conflict",
            message=f"槽位需求题目总数 ({total_slot_count}) 超过测试选卷总量 ({count})",
        )

    for idx, s in enumerate(slots):
        req = s.get("count", 0)
        available = len(slot_candidates[idx])
        if available < req:
            return SelectionResult(
                status="infeasible",
                reason_code="slot_insufficient_candidates",
                message=f"槽位「{s.get('id')}」候选题目不足（需要 {req} 道，仅有 {available} 道）",
            )

    # Step 3: Backtracking search with constraint pruning and node budget
    NODE_BUDGET = 5000
    node_count = 0
    exhausted = False
    assigned_slots: list[list[dict[str, Any]]] = []
    used_ids: set[str] = set()

    def search_slots(slot_idx: int, check_constraints: bool) -> list[dict[str, Any]] | None:
        nonlocal node_count, exhausted
        node_count += 1
        if node_count > NODE_BUDGET:
            exhausted = True
            return None

        flattened = [q for sublist in assigned_slots for q in sublist]
        remaining_total = count - len(flattened)
        if check_constraints and not can_satisfy_constraints(flattened, remaining_total, constraints):
            return None

        if slot_idx == len(slots):
            remaining_needed = count - len(used_ids)
            remaining_cands = [q for q in p_pool if str(q.get("id")) not in used_ids]
            if len(remaining_cands) < remaining_needed:
                return None
            if seed is not None:
                remaining_cands = shuffle(remaining_cands, f"{set_id}:pool:{seed}")
            return search_remaining(remaining_needed, remaining_cands, flattened, check_constraints)

        slot = slots[slot_idx]
        slot_need = slot.get("count", 0)
        cands = [q for q in slot_candidates[slot_idx] if str(q.get("id")) not in used_ids]
        if len(cands) < slot_need:
            return None

        for chosen in combinations(cands, slot_need):
            chosen_ids = {str(q.get("id")) for q in chosen}
            used_ids.update(chosen_ids)
            assigned_slots.append(list(chosen))

            result = search_slots(slot_idx + 1, check_constraints)
            if result is not None:
                return result
            if exhausted:
                return None

            assigned_slots.pop()
            used_ids.difference_update(chosen_ids)

        return None

    def search_remaining(
        needed: int,
        candidates: list[dict[str, Any]],
        current_selection: list[dict[str, Any]],
        check_constraints: bool,
    ) -> list[dict[str, Any]] | None:
        nonlocal node_count, exhausted
        if needed == 0:
            if not check_constraints or satisfies_constraints(current_selection, constraints):
                return list(current_selection)
            return None

        for chosen in combinations(candidates, needed):
            node_count += 1
            if node_count > NODE_BUDGET:
                exhausted = True
                return None
            trial = current_selection + list(chosen)
            if not check_constraints or satisfies_constraints(trial, constraints):
                return trial

        return None

    # First attempt: standard search with constraints
    solution = search_slots(0, check_constraints=True)
    if solution is not None:
        if seed is not None:
            final_questions = shuffle(solution, f"{set_id}:order:{seed}")
            result_questions: list[dict[str, Any]] = []
            for q in final_questions:
                q_copy = dict(q)
                if (
                    q_copy.get("choice_order") == "shuffle"
                    and "choices" in q_copy
                    and isinstance(q_copy["choices"], list)
                ):
                    q_copy["choices"] = shuffle(q_copy["choices"], f"{set_id}:{q_copy['id']}:choices:{seed}")
                result_questions.append(q_copy)
            return SelectionResult(status="ok", questions=result_questions)
        return SelectionResult(status="ok", questions=solution)

    if exhausted:
        return SelectionResult(
            status="exhausted",
            message="选题求解超出搜索节点预算，计算资源耗尽",
        )

    # Infeasible: check if failure was due to constraints or slot conflict
    node_count = 0
    assigned_slots.clear()
    used_ids.clear()
    unconstrained = search_slots(0, check_constraints=False) if constraints else None
    if exhausted:
        return SelectionResult(
            status="exhausted",
            message="选题求解超出搜索节点预算，计算资源耗尽",
        )
    if unconstrained is not None:
        return SelectionResult(
            status="infeasible",
            reason_code="constraint_violation",
            message="题目组合无法满足题型、难度或风格等分布约束",
        )

    return SelectionResult(
        status="infeasible",
        reason_code="slot_conflict",
        message="不同槽位之间的候选题目竞争导致无法同时满足",
    )


def solve_query_selection(
    pool: list[dict[str, Any]],
    query: dict[str, Any],
    taxonomy: TaxonomyRegistry | None = None,
    seed: str | None = None,
    set_id: str = "",
) -> list[dict[str, Any]] | None:
    res = solve_query_selection_detailed(pool, query, taxonomy, seed, set_id)
    return res.questions if res.status == "ok" else None

