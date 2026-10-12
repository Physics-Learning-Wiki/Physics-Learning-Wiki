from __future__ import annotations

import json
from pathlib import Path

import pytest
import yaml

from scripts.question_bank.batch_review import DIMENSIONS, apply_plan, create_plan, main
from scripts.question_bank.media import question_content_fingerprint
from scripts.question_bank.validator import validate_repository


@pytest.fixture
def repository(question_bank_repository: Path) -> Path:
    return question_bank_repository


def plan(root: Path, **selector):
    return create_plan(root, reviewer="test-reviewer", reviewed_on="2026-10-12",
                       dimensions=list(DIMENSIONS), **(selector or dict(directory="question-bank/questions/selected")))


def contents(root: Path):
    return {p.relative_to(root): p.read_bytes() for p in (root / "question-bank").rglob("*.yml")}


def test_plan_scopes_and_does_not_sign(repository: Path):
    before = contents(repository)
    selected = plan(repository)
    assert [x["id"] for x in selected["questions"]] == ["q-000001", "q-000002"]
    assert [x["id"] for x in selected["related_sets"]] == ["test.selected"]
    assert len(plan(repository, all_drafts=True)["questions"]) == 3
    assert len(plan(repository, set_ids=["test.selected"])["questions"]) == 2
    assert len(plan(repository, id_range="q-000001:q-000002")["questions"]) == 2
    assert [x["id"] for x in plan(repository, ids=["q-000003"])["questions"]] == ["q-000003"]
    assert contents(repository) == before


def test_apply_requires_human_confirmation(repository: Path):
    before = contents(repository)
    with pytest.raises(ValueError, match="confirm-human-review"):
        apply_plan(repository, plan(repository))
    assert contents(repository) == before


def test_stale_content_aborts_entire_batch(repository: Path):
    frozen = plan(repository)
    changed = repository / "question-bank/questions/selected/q-000002.yml"
    data = yaml.safe_load(changed.read_text(encoding="utf-8"))
    data["solution"] += " Updated."
    changed.write_text(yaml.safe_dump(data), encoding="utf-8")
    before = contents(repository)
    with pytest.raises(ValueError, match="stale plan for q-000002"):
        apply_plan(repository, frozen, confirm_human_review=True, publish=True)
    assert contents(repository) == before


def test_sign_only_keeps_drafts_and_is_idempotent(repository: Path):
    frozen = plan(repository)
    apply_plan(repository, frozen, confirm_human_review=True)
    apply_plan(repository, frozen, confirm_human_review=True)
    for q in validate_repository(repository).data.questions:
        assert q.data["status"] == "draft"
        if q.data["id"] == "q-000003":
            assert "review" not in q.data
            continue
        for dimension in DIMENSIONS:
            attestations = q.data["review"][dimension]
            assert len(attestations) == 1
            assert attestations[0]["github"] == "test-reviewer"
            assert attestations[0]["content_fingerprint"] == question_content_fingerprint(q.data, repository)


def test_publish_questions_and_only_related_sets(repository: Path):
    changed = apply_plan(repository, plan(repository), confirm_human_review=True, publish=True, publish_sets=True)
    assert len(changed) == 3
    report = validate_repository(repository)
    assert report.ok
    assert next(q for q in report.data.questions if q.data["id"] == "q-000002").data["type"] == "free_response"
    statuses = {q.data["id"]: q.data["status"] for q in report.data.questions}
    assert statuses == {"q-000001": "published", "q-000002": "published", "q-000003": "draft"}
    assert {s.data["id"]: s.data["status"] for s in report.data.sets} == {"test.selected": "published", "test.other": "draft"}


def test_failed_publish_restores_original_bytes(repository: Path):
    # Structurally valid draft, but invalid published taxonomy: final validation
    # must roll back every question and set, including signatures already written.
    path = repository / "question-bank/questions/selected/q-000002.yml"
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    data["concepts"] = ["test.unknown"]
    path.write_text(yaml.safe_dump(data), encoding="utf-8")
    frozen = plan(repository)
    before = contents(repository)
    with pytest.raises(ValueError, match="unknown concept"):
        apply_plan(repository, frozen, confirm_human_review=True, publish=True, publish_sets=True)
    assert contents(repository) == before


def test_changed_set_blocks_before_signing(repository: Path):
    frozen = plan(repository)
    path = repository / "question-bank/sets/selected.yml"
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    data["selection"]["order"] = "shuffle"
    path.write_text(yaml.safe_dump(data), encoding="utf-8")
    before = contents(repository)
    with pytest.raises(ValueError, match="stale set"):
        apply_plan(repository, frozen, confirm_human_review=True, publish=True, publish_sets=True)
    assert contents(repository) == before


def test_partial_dimension_publish_fails_and_rolls_back(repository: Path):
    frozen = plan(repository)
    frozen["dimensions"] = ["physics"]
    before = contents(repository)
    with pytest.raises(ValueError, match="attestation|review"):
        apply_plan(repository, frozen, confirm_human_review=True, publish=True)
    assert contents(repository) == before


def test_reject_unknown_ids_and_escaping_directory(repository: Path):
    with pytest.raises(ValueError, match="unknown question"):
        plan(repository, ids=["q-999999"])
    with pytest.raises(ValueError, match="inside question-bank"):
        plan(repository, directory="../")


def test_cli_plan_file_and_confirmation_failure(repository: Path, monkeypatch, capsys):
    monkeypatch.chdir(repository)
    before = contents(repository)
    assert main(["plan", "--all-drafts", "--reviewer", "test-reviewer", "--output", "review.json"]) == 0
    frozen = json.loads((repository / "review.json").read_text(encoding="utf-8"))
    assert len(frozen["questions"]) == 3
    assert main(["apply", "--plan", "review.json"]) == 1
    assert contents(repository) == before
    assert "No review marks written" in capsys.readouterr().out


def test_missing_feedback_fails_preflight_before_signing(repository: Path, monkeypatch):
    path = repository / "question-bank/questions/selected/q-000002.yml"
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    data.pop("feedback")
    path.write_text(yaml.safe_dump(data), encoding="utf-8")
    frozen = plan(repository)
    before = contents(repository)

    def unexpected_attest(*args, **kwargs):
        pytest.fail("Content preflight should fail before attest is called")

    monkeypatch.setattr("scripts.question_bank.batch_review.attest", unexpected_attest)
    with pytest.raises(ValueError, match=r"Publication content preflight failed[\s\S]*feedback"):
        apply_plan(repository, frozen, confirm_human_review=True, publish=True, publish_sets=True)
    assert contents(repository) == before
