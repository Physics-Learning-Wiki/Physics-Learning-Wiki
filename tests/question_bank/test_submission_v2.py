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
            "concepts": ["newton.inertia"],
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
        assert data["concepts"] == ["newton.inertia"]

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


def test_worker_submission_payload_e2e_all_types(tmp_path: Path) -> None:
    repo_root = Path.cwd()
    payloads = [
        {
            "schemaVersion": 2,
            "issueUrl": "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/1001",
            "question": {
                "type": "single_choice",
                "stem": "关于加速度的方向，下列说法正确的是：",
                "choices": [
                    {"id": "A", "content": "一定与速度方向相同"},
                    {"id": "B", "content": "一定与合外力方向相同"},
                    {"id": "C", "content": "一定与位移方向相同"},
                ],
                "answer": {"choice": "B"},
                "solution": "根据牛顿第二定律 F=ma，加速度方向恒与合外力方向相同。",
                "topics": ["mechanics.dynamics"],
                "concepts": ["newton.force-acceleration"],
            },
        },
        {
            "schemaVersion": 2,
            "issueUrl": "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/1002",
            "question": {
                "type": "multiple_choice",
                "stem": "下列属于矢量的物理量有：",
                "choices": [
                    {"id": "A", "content": "位移"},
                    {"id": "B", "content": "力"},
                    {"id": "C", "content": "温度"},
                ],
                "answer": {"choices": ["A", "B"]},
                "solution": "位移和力是矢量，具有大小和方向；温度是标量。",
                "topics": ["mechanics.kinematics"],
                "concepts": ["mechanics.vectors.basic"],
            },
        },
        {
            "schemaVersion": 2,
            "issueUrl": "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/1003",
            "question": {
                "type": "true_false",
                "stem": "两个相互作用的物体受到的作用力与反作用力大小相等、方向相反。",
                "answer": {"value": True},
                "solution": "牛顿第三定律指出作用力与反作用力大小相等、方向相反、作用在不同物体上。",
                "topics": ["mechanics.dynamics"],
                "concepts": ["newton.action-reaction"],
            },
        },
        {
            "schemaVersion": 2,
            "issueUrl": "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/1004",
            "question": {
                "type": "numeric",
                "stem": "真空中光速约为多少（以米每秒为单位，取三位有效数字）：",
                "answer": {
                    "value": 3.0e8,
                    "tolerance": {"type": "relative", "value": 0.01},
                    "unit": {"required": True, "accepted": ["m/s", "m s^-1"], "canonical": "m/s"},
                },
                "solution": "真空中光速约为 3.00 * 10^8 m/s。",
                "topics": ["optics.wave"],
                "concepts": ["optics.light-speed"],
            },
        },
    ]

    imported_paths = []
    try:
        for i, payload in enumerate(payloads):
            input_file = tmp_path / f"submission_{i}.json"
            input_file.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
            imported_path = import_issue(repo_root, input_file)
            imported_paths.append(imported_path)

        report = validate_repository(repo_root, include_drafts=True)
        for path in imported_paths:
            errors_for_file = [e for e in report.errors if e.path == path]
            assert not errors_for_file, f"Errors for {path}: {errors_for_file}"
    finally:
        for path in imported_paths:
            path.unlink(missing_ok=True)


def test_submission_v2_contract_fixture(tmp_path: Path) -> None:
    repo_root = Path.cwd()
    fixture_path = repo_root / "tests" / "question_bank" / "fixtures" / "submission_v2_contract.json"
    data = json.loads(fixture_path.read_text(encoding="utf-8"))

    imported_paths = []
    try:
        for name, question in data["valid"].items():
            payload = {
                "schemaVersion": 2,
                "issueUrl": f"https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/test-{name}",
                "question": question,
            }
            input_file = tmp_path / f"submission_contract_{name}.json"
            input_file.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
            imported_path = import_issue(repo_root, input_file)
            imported_paths.append(imported_path)

        report = validate_repository(repo_root, include_drafts=True)
        for path in imported_paths:
            errors_for_file = [e for e in report.errors if e.path == path]
            assert not errors_for_file, f"Errors for {path}: {errors_for_file}"
    finally:
        for path in imported_paths:
            path.unlink(missing_ok=True)


def test_submission_v2_contract_fixture_invalid_rejected(tmp_path: Path) -> None:
    repo_root = Path.cwd()
    fixture_path = repo_root / "tests" / "question_bank" / "fixtures" / "submission_v2_contract.json"
    data = json.loads(fixture_path.read_text(encoding="utf-8"))

    for name, inv in data["invalid"].items():
        base_obj = data["valid"][inv["base"]]
        test_obj = {**base_obj, **inv["override"]}
        payload = {
            "schemaVersion": 2,
            "issueUrl": f"https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/test-invalid-{name}",
            "question": test_obj,
        }
        input_file = tmp_path / f"sub_invalid_{name}.json"
        input_file.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        imported_path = None
        try:
            with pytest.raises(ValueError):
                imported_path = import_issue(repo_root, input_file)
        finally:
            if imported_path and imported_path.exists():
                imported_path.unlink()



