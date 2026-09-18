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

    # Production only includes published sets
    assert set(manifest["sets"].keys()) == {
        "mechanics.dynamics.newton-laws.quick",
        "mechanics.dynamics.newton-laws.full",
    }
    for set_entry in manifest["sets"].values():
        assert set_entry["status"] == "published"
        bundle_file = output / set_entry["bundle"]
        assert bundle_file.exists()


def test_production_compile_does_not_expose_drafts(tmp_path: Path) -> None:
    production = tmp_path / "production"
    report, _ = compile_repository(ROOT, production)
    assert report.ok

    manifest = json.loads((production / "manifest.json").read_text(encoding="utf-8"))
    assert "mechanics.kinematics.linear-motion.quick" not in manifest["sets"]
    assert "mechanics.kinematics.linear-motion.full" not in manifest["sets"]

    json_text = "".join(
        path.read_text(encoding="utf-8") for path in production.rglob("*.json")
    )
    assert "mech-kin-linear-0001" not in json_text


def test_preview_compile_exposes_drafts_and_linear_sets(tmp_path: Path) -> None:
    preview = tmp_path / "preview"
    report, _ = compile_repository(ROOT, preview, preview=True)
    assert report.ok

    manifest = json.loads((preview / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["preview"] is True
    assert set(manifest["sets"].keys()) == {
        "mechanics.dynamics.newton-laws.quick",
        "mechanics.dynamics.newton-laws.full",
        "mechanics.kinematics.linear-motion.quick",
        "mechanics.kinematics.linear-motion.full",
    }

    assert manifest["sets"]["mechanics.kinematics.linear-motion.quick"]["status"] == "draft"
    assert manifest["sets"]["mechanics.kinematics.linear-motion.full"]["status"] == "draft"

    json_text = "".join(
        path.read_text(encoding="utf-8") for path in preview.rglob("*.json")
    )
    assert "mech-kin-linear-0001" in json_text


def test_unchanged_compile_is_a_no_op(tmp_path: Path) -> None:
    output = tmp_path / "bank"
    compile_repository(ROOT, output)
    _, metrics = compile_repository(ROOT, output)
    assert metrics["written"] is False


def test_catalog_path_hash_is_stable(tmp_path: Path) -> None:
    first = tmp_path / "first"
    second = tmp_path / "second"
    compile_repository(ROOT, first)
    compile_repository(ROOT, second)

    m1 = json.loads((first / "manifest.json").read_text(encoding="utf-8"))
    m2 = json.loads((second / "manifest.json").read_text(encoding="utf-8"))
    assert m1["catalogs"] == m2["catalogs"]
    assert m1["bankFingerprint"] == m2["bankFingerprint"]


def test_set_bundles_structure_and_assets(tmp_path: Path) -> None:
    output = tmp_path / "bank"
    compile_repository(ROOT, output)

    manifest = json.loads((output / "manifest.json").read_text(encoding="utf-8"))
    quick_bundle_rel = manifest["sets"]["mechanics.dynamics.newton-laws.quick"]["bundle"]
    bundle_path = output / quick_bundle_rel
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
