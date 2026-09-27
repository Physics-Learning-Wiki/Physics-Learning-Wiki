from __future__ import annotations

import shutil
from pathlib import Path

import pytest
import yaml

from scripts.question_bank.cli import main
from scripts.question_bank.coverage import coverage_data, render_coverage
from scripts.question_bank.validator import validate_repository


def test_coverage_data_structure() -> None:
    report = validate_repository()
    data = coverage_data(report, preview=False)

    assert "summary" in data
    assert "topics" in data
    assert "types" in data
    assert "difficulties" in data
    assert "cognitive_levels" in data
    assert "styles" in data
    assert "concepts" in data
    assert "unregistered_taxonomy" in data
    assert "sets" in data
    assert "health_warnings" in data

    rendered = render_coverage(report, preview=False)
    assert "题库资源概况" in rendered
    assert "难度分布" in rendered
    assert "测试集合状态与可行性" in rendered


def test_cli_validate_and_coverage_commands(capsys) -> None:
    code_val = main(["validate"])
    assert code_val == 0

    code_cov = main(["coverage", "--format", "json"])
    assert code_cov == 0
    captured = capsys.readouterr()
    assert '"summary"' in captured.out


def infeasible_set_root(tmp_path: Path) -> tuple[Path, str]:
    root = tmp_path / "repository"
    schemas = root / "question-bank" / "schemas"
    schemas.mkdir(parents=True)
    for name in ("question.schema.json", "set.schema.json"):
        shutil.copyfile(Path(__file__).parents[2] / "question-bank" / "schemas" / name, schemas / name)
    set_id = "test.infeasible"
    set_path = root / "question-bank" / "sets" / "infeasible.yml"
    set_path.parent.mkdir(parents=True)
    set_path.write_text(yaml.safe_dump({
        "schema_version": 1,
        "id": set_id,
        "title": "Infeasible fixture",
        "status": "draft",
        "feedback_mode": "immediate",
        "selection": {"type": "query", "count": 1},
    }), encoding="utf-8")
    return root, set_id


def test_find_set_and_publish_infeasible_reverts(tmp_path: Path) -> None:
    from scripts.question_bank.maintenance import find_set, publish

    root, set_id = infeasible_set_root(tmp_path)
    path, data = find_set(root, set_id)
    assert data["status"] == "draft"

    with pytest.raises(ValueError, match="is not feasible"):
        publish(root, set_id)

    _, reverted = find_set(root, set_id)
    assert reverted["status"] == "draft"


def test_cli_publish_infeasible_set(tmp_path: Path, monkeypatch, capsys) -> None:
    root, set_id = infeasible_set_root(tmp_path)
    monkeypatch.chdir(root)
    code = main(["publish", "--id", set_id])
    assert code == 1
    captured = capsys.readouterr()
    assert "ERROR:" in captured.out
    from scripts.question_bank.maintenance import find_set
    assert find_set(root, set_id)[1]["status"] == "draft"

