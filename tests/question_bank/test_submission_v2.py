from __future__ import annotations

import json
from pathlib import Path

import pytest
import yaml

from scripts.question_bank.maintenance import import_issue, next_question_id
from scripts.question_bank.validator import validate_repository


def test_next_question_id_generates_sequential_ids(tmp_path: Path) -> None:
    questions_dir = tmp_path / "question-bank" / "questions"
    questions_dir.mkdir(parents=True)

    # Historical IDs should not affect q-NNNNNN
    (questions_dir / "kin-vec-0001.yml").write_text("id: kin-vec-0001\n", encoding="utf-8")
    (questions_dir / "subfolder").mkdir()
    (questions_dir / "subfolder" / "mech-dyn-0099.yml").write_text("id: mech-dyn-0099\n", encoding="utf-8")

    new_id, path = next_question_id(tmp_path)
    assert new_id == "q-000001"
    assert path == questions_dir / "inbox" / "q-000001.yml"

    # Simulate existing q-000001 and q-000005
    (questions_dir / "inbox").mkdir(parents=True, exist_ok=True)
    (questions_dir / "inbox" / "q-000001.yml").write_text("id: q-000001\n", encoding="utf-8")
    (questions_dir / "q-000005.yml").write_text("id: q-000005\n", encoding="utf-8")

    next_id2, path2 = next_question_id(tmp_path)
    assert next_id2 == "q-000006"
    assert path2 == questions_dir / "inbox" / "q-000006.yml"


def test_import_issue_minimal_payload(tmp_path: Path) -> None:
    repo_root = Path.cwd()

    payload = {
        "schemaVersion": 2,
        "issueUrl": "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/999",
        "question": {
            "type": "true_false",
            "stem": "匀速圆周运动物体的加速度方向始终指向圆心。",
            "answer": {"value": True},
            "solution": "做匀速圆周运动的物体，其向心加速度方向时刻指向圆心。",
            "attribution": "物理探索者",
        },
    }

    input_file = tmp_path / "submission.json"
    input_file.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    imported_path = import_issue(repo_root, input_file)
    try:
        assert imported_path.exists()
        data = yaml.safe_load(imported_path.read_text(encoding="utf-8"))
        assert data["schema_version"] == 3
        assert data["status"] == "draft"
        assert data["type"] == "true_false"
        assert data["answer"] == {"value": True}
        assert data["submission"]["issue_url"] == payload["issueUrl"]

        report = validate_repository(repo_root, include_drafts=True)
        errors_for_file = [e for e in report.errors if e.path == imported_path]
        assert not errors_for_file
    finally:
        imported_path.unlink(missing_ok=True)


def test_import_issue_with_optional_metadata(tmp_path: Path) -> None:
    repo_root = Path.cwd()

    payload = {
        "schemaVersion": 2,
        "question": {
            "type": "single_choice",
            "stem": "关于惯性，下列说法正确的是：",
            "choices": [
                {"id": "A", "content": "物体静止时没有惯性"},
                {"id": "B", "content": "质量是惯性大小的唯一量度"},
                {"id": "C", "content": "速度越大的物体惯性越大"},
            ],
            "answer": {"choice": "B"},
            "feedback": {
                "choices": {
                    "A": "错误",
                    "B": "正确",
                    "C": "错误",
                }
            },
            "solution": "质量是衡量物体惯性大小的物理量，与物体所处的状态或速度无关。",
            "topics": ["mechanics.dynamics"],
            "concepts": ["mechanics.newton.inertia"],
            "difficulty": 1,
            "cognitive_level": "understand",
            "style": "conceptual",
            "estimated_seconds": 60,
        },
    }

    input_file = tmp_path / "submission_full.json"
    input_file.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    imported_path = import_issue(repo_root, input_file)
    try:
        assert imported_path.exists()
        data = yaml.safe_load(imported_path.read_text(encoding="utf-8"))
        assert data["schema_version"] == 3
        assert data["difficulty"] == 1
        assert data["topics"] == ["mechanics.dynamics"]
        assert data["concepts"] == ["mechanics.newton.inertia"]

        report = validate_repository(repo_root, include_drafts=True)
        errors_for_file = [e for e in report.errors if e.path == imported_path]
        assert not errors_for_file
    finally:
        imported_path.unlink(missing_ok=True)


def test_import_issue_rejects_v1_payload(tmp_path: Path) -> None:
    payload_v1 = {
        "schemaVersion": 1,
        "question": {
            "page_id": "mechanics.dynamics.newton-laws",
            "type": "true_false",
            "stem": "测试题干",
            "answer": {"value": True},
            "solution": "测试解析",
        },
    }
    input_file = tmp_path / "submission_v1.json"
    input_file.write_text(json.dumps(payload_v1), encoding="utf-8")

    with pytest.raises(ValueError, match="unsupported question submission payload"):
        import_issue(Path.cwd(), input_file)
