from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest
import yaml

from scripts.question_bank.batch_review import DIMENSIONS, apply_plan, create_plan, main
from scripts.question_bank.media import question_content_fingerprint
from scripts.question_bank.validator import validate_repository

REPO = Path(__file__).parents[2]


@pytest.fixture
def repository(tmp_path: Path) -> Path:
    """Synthetic repository only: no attestation is written to real questions."""
    root = tmp_path / "repo"
    schemas = root / "question-bank/schemas"
    schemas.mkdir(parents=True)
    for filename in ("question.schema.json", "set.schema.json"):
        shutil.copyfile(REPO / "question-bank/schemas" / filename, schemas / filename)
    taxonomy = root / "question-bank/taxonomy"
    (taxonomy / "concepts").mkdir(parents=True)
    (taxonomy / "topics.yml").write_text("test.topic:\n  title: Test\n", encoding="utf-8")
    (taxonomy / "concepts/test.yml").write_text("test.concept:\n  title: Test\n  topics: [test.topic]\n", encoding="utf-8")
    original = yaml.safe_load((REPO / "question-bank/fixtures/valid/true-false.yml").read_text(encoding="utf-8"))
    for number in range(1, 4):
        question = {**original, "id": f"q-{number:06d}", "status": "draft",
                    "topics": ["test.topic"], "concepts": ["test.concept"],
                    "stem": f"Synthetic question {number}: " + original["stem"],
                    "difficulty": 1, "cognitive_level": "understand", "style": "conceptual",
                    "estimated_seconds": 30}
        question.pop("review", None)
        question.pop("related_pages", None)
        question.pop("objectives", None)
        folder = "selected" if number <= 2 else "other"
        path = root / f"question-bank/questions/{folder}/q-{number:06d}.yml"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.safe_dump(question, allow_unicode=True), encoding="utf-8")
    for name, ids in [("selected", ["q-000001", "q-000002"]), ("other", ["q-000003"])]:
        path = root / f"question-bank/sets/{name}.yml"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.safe_dump(dict(schema_version=1, id=f"test.{name}", title=name,
                                           status="draft", feedback_mode="immediate",
                                           selection=dict(type="fixed", questions=ids, order="fixed"))), encoding="utf-8")
    assert validate_repository(root).ok
    return root


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


def test_actual_draft_content_can_publish_in_isolated_copy(tmp_path: Path):
    # Regression for q-000050–q-000089: synthetic true/false fixtures already
    # contained feedback and did not exercise actual free-response drafts.
    # Fictional test signatures are written ONLY to the isolated copy.
    root = tmp_path / "isolated-content-repository"
    shutil.copytree(REPO / "question-bank", root / "question-bank")
    for source in (REPO / "docs").rglob("*.md"):
        target = root / "docs" / source.relative_to(REPO / "docs")
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    frozen = plan(root, all_drafts=True)
    apply_plan(root, frozen, confirm_human_review=True, publish=True, publish_sets=True)
    report = validate_repository(root)
    assert report.ok, "\n".join(issue.render() for issue in report.errors)
    question_status = {doc.data["id"]: doc.data["status"] for doc in report.data.questions}
    assert all(question_status[f"q-{number:06d}"] == "published" for number in range(50, 90))
    assert all(question_status[entry["id"]] == "published" for entry in frozen["questions"])
    set_status = {doc.data["id"]: doc.data["status"] for doc in report.data.sets}
    assert len([entry for entry in frozen["related_sets"] if entry["id"].startswith("math.complex-analysis.residue-")]) == 7
    assert all(set_status[entry["id"]] == "published" for entry in frozen["related_sets"])
