from __future__ import annotations

from pathlib import Path

from scripts.question_bank.cli import main
from scripts.question_bank.coverage import coverage_data, render_coverage
from scripts.question_bank.validator import validate_repository


def test_coverage_data_structure() -> None:
    report = validate_repository()
    data = coverage_data(report, preview=False)

    assert "summary" in data
    assert data["summary"]["total"] >= 38
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


def test_find_set_and_publish_infeasible_reverts() -> None:
    import pytest
    from scripts.question_bank.maintenance import find_set, publish

    root = Path(__file__).parents[2]
    path, data = find_set(root, "mechanics.kinematics.linear-motion.quick")
    assert data["status"] == "draft"

    with pytest.raises(ValueError, match="is not feasible"):
        publish(root, "mechanics.kinematics.linear-motion.quick")

    _, reverted = find_set(root, "mechanics.kinematics.linear-motion.quick")
    assert reverted["status"] == "draft"


def test_cli_publish_infeasible_set(capsys) -> None:
    code = main(["publish", "--id", "mechanics.kinematics.linear-motion.quick"])
    assert code == 1
    captured = capsys.readouterr()
    assert "ERROR:" in captured.out
    assert "is not feasible" in captured.out

