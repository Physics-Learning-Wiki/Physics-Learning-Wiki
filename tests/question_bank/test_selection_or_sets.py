from pathlib import Path
from typing import Any

import pytest

from scripts.question_bank.loader import load_json, load_taxonomy, load_yaml
from scripts.question_bank.models import (
    PageContract,
    PageRegistry,
    SourceDocument,
    TaxonomyRegistry,
)
from scripts.question_bank.selection import (
    create_random,
    hash_seed,
    matches_filters,
    shuffle,
    solve_query_selection,
)
from scripts.question_bank.validator import validate_set

ROOT = Path(__file__).parents[2]


def test_taxonomy_loading_and_hierarchy() -> None:
    registry, issues = load_taxonomy(ROOT / "question-bank" / "taxonomy")
    assert not issues
    assert registry.is_valid_topic("mechanics")
    assert registry.is_valid_topic("mechanics.dynamics")
    assert registry.is_valid_topic("mechanics.kinematics")
    assert registry.is_valid_concept("newton.inertia")

    # Descendants of mechanics must include dynamics and kinematics
    descendants = registry.get_topic_descendants_and_self("mechanics")
    assert "mechanics.dynamics" in descendants
    assert "mechanics.kinematics" in descendants
    assert "mechanics" in descendants


def test_mulberry32_prng_deterministic_vector() -> None:
    # Golden vectors matching TS implementation
    rnd = create_random("test-seed")
    values = [rnd(), rnd(), rnd()]
    assert abs(values[0] - 0.3584189757) < 1e-6
    assert abs(values[1] - 0.5269410228) < 1e-6
    assert abs(values[2] - 0.1207547213) < 1e-6

    # Shuffle determinism
    items = ["q1", "q2", "q3", "q4", "q5"]
    s1 = shuffle(items, "seed-abc")
    s2 = shuffle(items, "seed-abc")
    assert s1 == s2
    assert s1 != items


def test_shared_golden_fixture_selection_v1() -> None:
    from scripts.question_bank.selection import solve_query_selection_detailed

    fixture = load_json(ROOT / "tests" / "question_bank" / "fixtures" / "selection_v1_golden.json")

    # 1. PRNG vectors
    for item in fixture["prng_vectors"]:
        rnd = create_random(item["seed"])
        vals = [rnd(), rnd(), rnd()]
        for idx, expected in enumerate(item["expected_floats"]):
            assert abs(vals[idx] - expected) < 1e-6, f"PRNG mismatch for seed {item['seed']}"

    # 2. Shuffle vectors
    for item in fixture["shuffle_vectors"]:
        shuffled = shuffle(item["input"], item["seed"])
        assert shuffled == item["expected"], f"Shuffle mismatch for seed {item['seed']}"

    # 3. Overlapping slots
    solvers = fixture["solvers"]
    os_case = solvers["overlapping_slots"]
    sol = solve_query_selection(os_case["pool"], os_case["query"])
    assert sol is not None
    assert {q["id"] for q in sol} == set(os_case["expected_ids"])

    # 4. Composition constraints
    cc_case = solvers["composition_constraints"]
    sol = solve_query_selection(cc_case["pool"], cc_case["query"])
    assert sol is not None
    assert {q["id"] for q in sol} == set(cc_case["expected_ids"])

    # 5. Solver diagnostics
    diag = solvers["diagnostics"]
    for case_name, case_data in diag.items():
        res = solve_query_selection_detailed(case_data["pool"], case_data["query"])
        assert res.status == case_data["expected_status"], f"Expected {case_data['expected_status']} in {case_name}"
        assert res.reason_code == case_data["expected_reason_code"], f"Expected {case_data['expected_reason_code']} in {case_name}"



def test_filter_matching_with_taxonomy() -> None:
    registry, _ = load_taxonomy(ROOT / "question-bank" / "taxonomy")
    question = {
        "id": "q1",
        "topics": ["mechanics.dynamics"],
        "concepts": ["newton.inertia"],
        "difficulty": 1,
        "style": "conceptual",
        "type": "true_false",
    }

    # Match by parent topic
    assert matches_filters(question, {"topics": {"any": ["mechanics"]}}, registry)
    # Match by exact topic
    assert matches_filters(question, {"topics": {"any": ["mechanics.dynamics"]}}, registry)
    # Fail unrelated topic
    assert not matches_filters(question, {"topics": {"any": ["mechanics.kinematics"]}}, registry)

    # Missing metadata in draft question does not match when restricted
    draft_q = {"id": "q2", "type": "true_false"}
    assert not matches_filters(draft_q, {"difficulty": {"min": 1, "max": 2}}, registry)
    assert not matches_filters(draft_q, {"styles": ["conceptual"]}, registry)
    # But matches when unrestricted
    assert matches_filters(draft_q, {"types": ["true_false"]}, registry)


def test_overlapping_slots_backtracking_solves_optimally() -> None:
    # Slot A can take q1 or q2 (count 1)
    # Slot B can ONLY take q1 (count 1)
    # A greedy picker picking q1 for A first would leave B empty.
    # Backtracking solver must assign A=q2 and B=q1.
    pool = [
        {"id": "q1", "type": "single_choice", "topics": ["mechanics.dynamics"]},
        {"id": "q2", "type": "single_choice", "topics": ["mechanics.dynamics"]},
    ]
    query = {
        "type": "query",
        "count": 2,
        "slots": [
            {"id": "slot-a", "count": 1, "filters": {"question_ids": ["q1", "q2"]}},
            {"id": "slot-b", "count": 1, "filters": {"question_ids": ["q1"]}},
        ],
    }
    solution = solve_query_selection(pool, query)
    assert solution is not None
    assert len(solution) == 2
    ids = {q["id"] for q in solution}
    assert ids == {"q1", "q2"}


def test_backtracking_with_composition_constraints() -> None:
    # 4 questions in pool, need count 2
    # slot A takes q1 or q2 (count 1)
    # remaining picks 1 from {q3, q4}
    # Constraint: difficulty 1 must be exactly 2
    # q1: diff 1, q2: diff 2, q3: diff 2, q4: diff 1
    pool = [
        {"id": "q1", "difficulty": 1},
        {"id": "q2", "difficulty": 2},
        {"id": "q3", "difficulty": 2},
        {"id": "q4", "difficulty": 1},
    ]
    query = {
        "type": "query",
        "count": 2,
        "slots": [{"id": "slot-a", "count": 1, "filters": {"question_ids": ["q1", "q2"]}}],
        "constraints": [{"field": "difficulty", "values": [1], "min": 2, "max": 2}],
    }
    solution = solve_query_selection(pool, query)
    assert solution is not None
    ids = {q["id"] for q in solution}
    assert ids == {"q1", "q4"}


def test_validate_set_rules() -> None:
    schema = load_json(ROOT / "question-bank" / "schemas" / "set.schema.json")
    taxonomy, _ = load_taxonomy(ROOT / "question-bank" / "taxonomy")

    questions = {
        "q-000001": {"id": "q-000001", "status": "published", "topics": ["mechanics.dynamics"], "difficulty": 1, "type": "true_false"},
        "q-000002": {"id": "q-000002", "status": "draft", "topics": ["mechanics.dynamics"], "difficulty": 1, "type": "true_false"},
        "q-000003": {"id": "q-000003", "status": "retired", "topics": ["mechanics.dynamics"], "difficulty": 1, "type": "true_false"},
    }

    # 1. Published fixed set citing draft question is error
    pub_fixed_doc = SourceDocument(
        path=ROOT / "set1.yml",
        data={
            "schema_version": 1,
            "id": "mechanics.dynamics.test-set",
            "title": "Test Set",
            "status": "published",
            "feedback_mode": "immediate",
            "selection": {"type": "fixed", "questions": ["q-000001", "q-000002"], "order": "fixed"},
        },
    )
    issues = validate_set(pub_fixed_doc, schema, questions, taxonomy)
    assert any("published set cannot reference draft question" in issue.message for issue in issues)

    # 2. Draft fixed set citing draft is allowed
    draft_fixed_doc = SourceDocument(
        path=ROOT / "set2.yml",
        data={
            "schema_version": 1,
            "id": "mechanics.dynamics.test-set-draft",
            "title": "Draft Set",
            "status": "draft",
            "feedback_mode": "immediate",
            "selection": {"type": "fixed", "questions": ["q-000001", "q-000002"], "order": "fixed"},
        },
    )
    draft_issues = validate_set(draft_fixed_doc, schema, questions, taxonomy)
    assert not [i for i in draft_issues if i.severity == "error"]

    # 3. Fixed set citing retired question is error
    retired_ref_doc = SourceDocument(
        path=ROOT / "set3.yml",
        data={
            "schema_version": 1,
            "id": "mechanics.dynamics.test-retired",
            "title": "Test Set",
            "status": "draft",
            "feedback_mode": "immediate",
            "selection": {"type": "fixed", "questions": ["q-000003"], "order": "fixed"},
        },
    )
    ret_issues = validate_set(retired_ref_doc, schema, questions, taxonomy)
    assert any("is retired" in issue.message for issue in ret_issues)

    # 4. Slot count sum exceeds count is error
    slot_sum_doc = SourceDocument(
        path=ROOT / "set4.yml",
        data={
            "schema_version": 1,
            "id": "mechanics.dynamics.test-slot-sum",
            "title": "Slot Sum Test",
            "status": "draft",
            "feedback_mode": "deferred",
            "selection": {
                "type": "query",
                "count": 2,
                "slots": [
                    {"id": "s1", "count": 2},
                    {"id": "s2", "count": 1},
                ],
            },
        },
    )
    slot_issues = validate_set(slot_sum_doc, schema, questions, taxonomy)
    assert any("exceeds selection count" in issue.message for issue in slot_issues)

    # 5. Constraint min > max is error
    constraint_doc = SourceDocument(
        path=ROOT / "set5.yml",
        data={
            "schema_version": 1,
            "id": "mechanics.dynamics.test-constraint",
            "title": "Constraint Test",
            "status": "draft",
            "feedback_mode": "deferred",
            "selection": {
                "type": "query",
                "count": 2,
                "constraints": [{"field": "difficulty", "values": [1], "min": 3, "max": 1}],
            },
        },
    )
    c_issues = validate_set(constraint_doc, schema, questions, taxonomy)
    assert any("min must not exceed max" in issue.message for issue in c_issues)

    # 6. Infeasible query set: Error when published, Warning when draft
    infeasible_query = {
        "type": "query",
        "count": 10,
    }
    pub_query_doc = SourceDocument(
        path=ROOT / "set6.yml",
        data={
            "schema_version": 1,
            "id": "mechanics.dynamics.test-infeasible",
            "title": "Infeasible Test",
            "status": "published",
            "feedback_mode": "deferred",
            "selection": infeasible_query,
        },
    )
    pub_issues = validate_set(pub_query_doc, schema, questions, taxonomy)
    assert any(i.severity == "error" and "no candidate question set satisfies" in i.message for i in pub_issues)

    draft_query_doc = SourceDocument(
        path=ROOT / "set7.yml",
        data={
            "schema_version": 1,
            "id": "mechanics.dynamics.test-infeasible-draft",
            "title": "Infeasible Draft Test",
            "status": "draft",
            "feedback_mode": "deferred",
            "selection": infeasible_query,
        },
    )
    draft_q_issues = validate_set(draft_query_doc, schema, questions, taxonomy)
    assert not [i for i in draft_q_issues if i.severity == "error"]
    assert any(i.severity == "warning" and "no candidate question set satisfies" in i.message for i in draft_q_issues)
