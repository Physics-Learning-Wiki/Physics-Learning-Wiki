import json
from pathlib import Path

from scripts.question_bank.compiler import compile_repository

ROOT = Path(__file__).parents[2]


def test_compiler_creates_manifest_and_page_bundles(tmp_path: Path) -> None:
    output = tmp_path / "bank"
    report, metrics = compile_repository(ROOT, output)
    assert report.ok
    assert metrics["written"] is True
    manifest = json.loads((output / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["schemaVersion"] == 2
    assert set(manifest["pages"]) == {
        "mechanics.dynamics.newton-laws",
        "mechanics.kinematics.linear-motion",
    }


def test_compiler_creates_manifest_and_page_bundles(tmp_path: Path) -> None:
    output = tmp_path / "bank"
    report, metrics = compile_repository(ROOT, output)

    assert report.ok
    assert metrics["written"] is True

    manifest = json.loads((output / "manifest.json").read_text(encoding="utf-8"))

    assert manifest["schemaVersion"] == 2
    assert manifest["preview"] is False
    assert manifest["pages"]

    for page in manifest["pages"].values():
        assert page["status"] in {"available", "construction"}
        assert isinstance(page["publishedQuestionCount"], int)
        assert page["publishedQuestionCount"] >= 0
        assert page["bundle"]


def test_unchanged_compile_is_a_no_op(tmp_path: Path) -> None:
    output = tmp_path / "bank"
    compile_repository(ROOT, output)
    _, metrics = compile_repository(ROOT, output)
    assert metrics["written"] is False


def test_drafts_only_appear_in_explicit_preview(tmp_path: Path) -> None:
    production = tmp_path / "production"
    preview = tmp_path / "preview"
    compile_repository(ROOT, production)
    compile_repository(ROOT, preview, preview=True)
    production_text = "".join(
        path.read_text(encoding="utf-8") for path in production.rglob("*.json")
    )
    preview_text = "".join(
        path.read_text(encoding="utf-8") for path in preview.rglob("*.json")
    )
    assert "mech-kin-linear-0001" not in production_text
    assert "mech-kin-linear-0001" in preview_text
    assert '"preview":true' in preview_text
    assert '"schemaVersion":2' in preview_text
    assert "data-plw-asset" in preview_text
    assert any(path.suffix == ".svg" for path in preview.rglob("*"))
