from pathlib import Path

import frontmatter
from jsonschema import Draft202012Validator

from scripts.question_bank.loader import load_json, load_taxonomy, load_tree, load_yaml
from scripts.question_bank.selection import solve_query_selection

ROOT = Path(__file__).parents[2]


def test_questions_have_no_scope_or_legacy_objectives() -> None:
    questions, issues = load_tree(ROOT / "question-bank" / "questions")
    assert not issues
    assert len(questions) == 38

    for doc in questions:
        data = doc.data
        assert data.get("schema_version") == 3, f"{doc.path} must have schema_version 3"
        assert "scope" not in data, f"{doc.path} must not contain 'scope'"
        assert "primary_objective" not in data, f"{doc.path} must not contain 'primary_objective'"
        assert "secondary_objectives" not in data, f"{doc.path} must not contain 'secondary_objectives'"
        assert "topics" in data, f"{doc.path} must contain 'topics'"
        assert "concepts" in data, f"{doc.path} must contain 'concepts'"
        assert "objectives" in data, f"{doc.path} must contain 'objectives'"
        assert "related_pages" in data, f"{doc.path} must contain 'related_pages'"


def test_blueprints_directory_and_schema_do_not_exist() -> None:
    assert not (ROOT / "question-bank" / "blueprints").exists()
    assert not (ROOT / "question-bank" / "schemas" / "blueprint.schema.json").exists()


def test_page_front_matters_have_no_quiz_and_have_assessments() -> None:
    for md_file in sorted((ROOT / "docs").rglob("*.md")):
        post = frontmatter.load(md_file)
        assert "quiz" not in post.metadata, f"{md_file} must not contain legacy 'quiz' front matter"

    newton_md = ROOT / "docs" / "mechanics" / "dynamics" / "newton-laws.md"
    newton_post = frontmatter.load(newton_md)
    assert "assessments" in newton_post.metadata
    assert [a["set"] for a in newton_post.metadata["assessments"]] == [
        "mechanics.dynamics.newton-laws.quick",
        "mechanics.dynamics.newton-laws.full",
    ]

    linear_md = ROOT / "docs" / "mechanics" / "kinematics" / "linear-motion.md"
    linear_post = frontmatter.load(linear_md)
    assert "assessments" in linear_post.metadata
    assert [a["set"] for a in linear_post.metadata["assessments"]] == [
        "mechanics.kinematics.linear-motion.quick",
        "mechanics.kinematics.linear-motion.full",
    ]


def test_four_migrated_sets_parse_and_validate() -> None:
    sets_dir = ROOT / "question-bank" / "sets"
    expected_sets = [
        "mechanics.dynamics.newton-laws.quick",
        "mechanics.dynamics.newton-laws.full",
        "mechanics.kinematics.linear-motion.quick",
        "mechanics.kinematics.linear-motion.full",
    ]

    set_schema = load_json(ROOT / "question-bank" / "schemas" / "set.schema.json")
    validator = Draft202012Validator(set_schema)

    found_ids = []
    for p in sets_dir.rglob("*.yml"):
        doc, load_issues = load_yaml(p)
        assert not load_issues
        assert doc is not None
        errors = list(validator.iter_errors(doc.data))
        assert not errors, f"Errors in {p}: {errors}"
        found_ids.append(doc.data["id"])

    assert sorted(found_ids) == sorted(expected_sets)


def test_newton_published_sets_are_feasible_in_published_pool() -> None:
    taxonomy, _ = load_taxonomy(ROOT / "question-bank" / "taxonomy")
    questions, _ = load_tree(ROOT / "question-bank" / "questions")
    published_questions = [q.data for q in questions if q.data.get("status") == "published"]

    quick_doc, _ = load_yaml(ROOT / "question-bank" / "sets" / "mechanics" / "dynamics" / "newton-laws-quick.yml")
    assert quick_doc is not None
    quick_sol = solve_query_selection(
        published_questions,
        quick_doc.data["selection"],
        taxonomy,
        set_id=quick_doc.data["id"],
    )
    assert quick_sol is not None
    assert len(quick_sol) == 3

    full_doc, _ = load_yaml(ROOT / "question-bank" / "sets" / "mechanics" / "dynamics" / "newton-laws-full.yml")
    assert full_doc is not None
    full_sol = solve_query_selection(
        published_questions,
        full_doc.data["selection"],
        taxonomy,
        set_id=full_doc.data["id"],
    )
    assert full_sol is not None
    assert len(full_sol) == 8


def test_linear_draft_sets_are_feasible_in_preview_pool() -> None:
    taxonomy, _ = load_taxonomy(ROOT / "question-bank" / "taxonomy")
    questions, _ = load_tree(ROOT / "question-bank" / "questions")
    preview_questions = [q.data for q in questions if q.data.get("status") in {"published", "draft"}]

    quick_doc, _ = load_yaml(ROOT / "question-bank" / "sets" / "mechanics" / "kinematics" / "linear-motion-quick.yml")
    assert quick_doc is not None
    quick_sol = solve_query_selection(
        preview_questions,
        quick_doc.data["selection"],
        taxonomy,
        set_id=quick_doc.data["id"],
    )
    assert quick_sol is not None
    assert len(quick_sol) == 3

    full_doc, _ = load_yaml(ROOT / "question-bank" / "sets" / "mechanics" / "kinematics" / "linear-motion-full.yml")
    assert full_doc is not None
    full_sol = solve_query_selection(
        preview_questions,
        full_doc.data["selection"],
        taxonomy,
        set_id=full_doc.data["id"],
    )
    assert full_sol is not None
    assert len(full_sol) == 8
