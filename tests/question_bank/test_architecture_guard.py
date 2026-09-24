from __future__ import annotations

import json
from pathlib import Path

import yaml

ROOT = Path(__file__).parents[2]


def test_no_legacy_fields_in_production_questions() -> None:
    questions_dir = ROOT / "question-bank" / "questions"
    assert questions_dir.exists()

    forbidden_keys = {
        "scope",
        "primary_objective",
        "secondary_objectives",
        "blueprint",
        "question_prefix",
    }

    for path in questions_dir.rglob("*.yml"):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        assert isinstance(data, dict), f"{path} must be a yaml dict"
        for key in forbidden_keys:
            assert (
                key not in data
            ), f"Forbidden legacy field {key!r} found in question {path}"
        assert data.get("schema_version") == 3, f"{path} must have schema_version 3"


def test_no_quiz_in_docs_front_matter() -> None:
    docs_dir = ROOT / "docs"
    assert docs_dir.exists()

    for path in docs_dir.rglob("*.md"):
        content = path.read_text(encoding="utf-8")
        if content.startswith("---"):
            end_idx = content.find("---", 3)
            if end_idx != -1:
                fm = content[3:end_idx]
                assert (
                    "quiz:" not in fm
                ), f"Legacy 'quiz:' front matter key found in {path}"


def test_blueprints_directory_and_schema_do_not_exist() -> None:
    assert not (ROOT / "question-bank" / "blueprints").exists()
    assert not (
        ROOT / "question-bank" / "schemas" / "blueprint.schema.json"
    ).exists()


def test_browser_loader_and_frontend_do_not_contain_v1_storage() -> None:
    quiz_src = ROOT / "scripts" / "quiz" / "src"
    assert quiz_src.exists()

    for path in quiz_src.rglob("*.ts"):
        content = path.read_text(encoding="utf-8")
        assert (
            "plw.quiz.v1" not in content
        ), f"Legacy storage key 'plw.quiz.v1' found in {path}"
        assert (
            "schemaVersion !== 3" in content or "schemaVersion !== 2" not in content
        ), f"Question bundle loader must check schemaVersion 3 in {path}"


def test_worker_produces_submission_v2() -> None:
    worker_file = ROOT / "workers" / "submit.js"
    assert worker_file.exists()
    content = worker_file.read_text(encoding="utf-8")
    assert "plw-question-submission-v2" in content
    assert "plw-question-submission-v1" not in content
    assert "schemaVersion: 2" in content
    assert "schemaVersion: 1" not in content


def test_submission_workflow_consumes_v2_payload() -> None:
    workflow_file = ROOT / ".github" / "workflows" / "question-submission.yml"
    assert workflow_file.exists()
    content = workflow_file.read_text(encoding="utf-8")
    assert "plw-question-submission-v2" in content
    assert "plw-question-submission-v1" not in content


def test_sets_have_schema_version_1() -> None:
    sets_dir = ROOT / "question-bank" / "sets"
    assert sets_dir.exists()
    for path in sets_dir.rglob("*.yml"):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        assert isinstance(data, dict), f"{path} must be a yaml dict"
        assert data.get("schema_version") == 1, f"{path} must have schema_version 1"


def test_scripts_do_not_contain_publication_readiness() -> None:
    scripts_dir = ROOT / "scripts" / "question_bank"
    assert scripts_dir.exists()
    for path in scripts_dir.rglob("*.py"):
        content = path.read_text(encoding="utf-8")
        assert (
            "publication_readiness" not in content
        ), f"Legacy 'publication_readiness' found in {path}"

