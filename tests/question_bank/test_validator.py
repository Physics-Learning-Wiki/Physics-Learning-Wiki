from pathlib import Path

import pytest

from scripts.question_bank.loader import load_json, load_yaml
from scripts.question_bank.page_contracts import discover_page_contracts
from scripts.question_bank.validator import validate_question, validate_repository


ROOT = Path(__file__).parents[2]


@pytest.mark.parametrize("name", ["single-choice.yml", "multiple-choice.yml", "true-false.yml", "numeric.yml"])
def test_valid_question_fixtures(name: str) -> None:
    document, load_issues = load_yaml(ROOT / "question-bank" / "fixtures" / "valid" / name)
    pages, page_issues = discover_page_contracts(ROOT)
    schema = load_json(ROOT / "question-bank" / "schemas" / "question.schema.json")
    assert document is not None
    assert not load_issues
    assert not page_issues
    assert not validate_question(document, schema, pages)


def test_dangerous_html_is_rejected() -> None:
    path = ROOT / "question-bank" / "fixtures" / "valid" / "single-choice.yml"
    document, _ = load_yaml(path)
    assert document is not None
    document.data["stem"] = "<script>alert(1)</script>"
    pages, _ = discover_page_contracts(ROOT)
    schema = load_json(ROOT / "question-bank" / "schemas" / "question.schema.json")
    assert any("dangerous" in issue.message for issue in validate_question(document, schema, pages))


def test_zero_relative_tolerance_is_rejected() -> None:
    path = ROOT / "question-bank" / "fixtures" / "valid" / "numeric.yml"
    document, _ = load_yaml(path)
    assert document is not None
    document.data["answer"]["value"] = 0
    document.data["answer"]["tolerance"]["type"] = "relative"
    pages, _ = discover_page_contracts(ROOT)
    schema = load_json(ROOT / "question-bank" / "schemas" / "question.schema.json")
    assert any("absolute" in issue.message for issue in validate_question(document, schema, pages))


def test_repository_allows_construction_but_release_rejects_it() -> None:
    normal = validate_repository(ROOT)
    release = validate_repository(ROOT, release=True)
    assert normal.ok
    assert normal.warnings
    assert not release.ok
