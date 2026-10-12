from __future__ import annotations

import json
from pathlib import Path

from scripts.question_bank.compiler import compile_repository

ROOT = Path(__file__).parents[2]


def test_compiler_creates_manifest_v3_and_catalogs(tmp_path: Path) -> None:
    output = tmp_path / "bank"
    report, metrics = compile_repository(ROOT, output)

    assert report.ok
    assert metrics["written"] is True

    manifest_path = output / "manifest.json"
    assert manifest_path.exists()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    assert manifest["schemaVersion"] == 3
    assert manifest["preview"] is False
    assert manifest["selectionAlgorithmVersion"] == 1
    assert "pages" not in manifest

    catalogs = manifest["catalogs"]
    assert "questions" in catalogs
    assert "sets" in catalogs
    assert "taxonomy" in catalogs

    for cat_rel in catalogs.values():
        cat_path = output / cat_rel
        assert cat_path.exists(), f"Catalog {cat_rel} not found"

    set_catalog = json.loads((output / catalogs["sets"]).read_text(encoding="utf-8"))
    estimates = {item["id"]: item["estimatedMinutes"] for item in set_catalog}
    for set_entry in manifest["sets"].values():
        assert set_entry["status"] == "published"
        bundle_file = output / set_entry["bundle"]
        assert bundle_file.exists()


def test_compile_filters_drafts_by_mode(mixed_question_bank: Path, tmp_path: Path) -> None:
    for preview in (False, True):
        output = tmp_path / ("preview" if preview else "production")
        report, _ = compile_repository(mixed_question_bank, output, preview=preview)
        assert report.ok
        manifest = json.loads((output / "manifest.json").read_text(encoding="utf-8"))
        assert manifest["preview"] is preview
        questions = json.loads((output / manifest["catalogs"]["questions"]).read_text(encoding="utf-8"))
        expected_ids = {"q-000001", "q-000002", "q-000003"} if preview else {"q-000003"}
        assert {q["id"] for q in questions} == expected_ids
        assert set(manifest["sets"]) == ({"test.selected", "test.other"} if preview else {"test.other"})
        for entry in manifest["sets"].values():
            bundle = json.loads((output / entry["bundle"]).read_text(encoding="utf-8"))
            assert {q["id"] for q in bundle["questions"]} <= expected_ids


def test_unchanged_compile_is_a_no_op(tmp_path: Path) -> None:
    output = tmp_path / "bank"
    compile_repository(ROOT, output)
    _, metrics = compile_repository(ROOT, output)
    assert metrics["written"] is False


def test_set_bundles_structure_and_assets(tmp_path: Path) -> None:
    output = tmp_path / "bank"
    compile_repository(ROOT, output)

    manifest = json.loads((output / "manifest.json").read_text(encoding="utf-8"))
    runnable_set = next(
        (entry for entry in manifest["sets"].values() if entry["status"] == "published"),
        None,
    )
    assert runnable_set is not None, "fixture requires a published set"
    bundle_path = output / runnable_set["bundle"]
    assert bundle_path.exists()

    bundle = json.loads(bundle_path.read_text(encoding="utf-8"))
    assert bundle["schemaVersion"] == 3
    assert bundle["selectionAlgorithmVersion"] == 1
    assert bundle["runnable"] is True
    assert bundle["unavailableReason"] is None
    assert len(bundle["questions"]) > 0

    first_q = bundle["questions"][0]
    assert "id" in first_q
    assert "topicIds" in first_q
    assert "conceptIds" in first_q
    assert "objectiveIds" in first_q
    assert "relatedPages" in first_q
    assert "stemHtml" in first_q
    assert first_q["source"]["stemMarkdown"]
    assert "answer" not in first_q["source"]
    assert "solution" not in first_q["source"]
    if "choices" in first_q:
        assert [choice["id"] for choice in first_q["source"]["choices"]] == [
            choice["id"] for choice in first_q["choices"]
        ]
    assert "primaryObjective" not in first_q
    assert "secondaryObjectives" not in first_q

    # Check assets directory
    assets_dir = output / "assets"
    assert assets_dir.exists()
    svg_files = list(assets_dir.glob("*.svg"))
    assert len(svg_files) > 0
    for svg_file in svg_files:
        content = svg_file.read_bytes()
        assert b"\r" not in content, f"{svg_file} has non-normalized line endings"
