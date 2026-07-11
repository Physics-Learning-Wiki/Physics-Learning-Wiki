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
    assert set(manifest["pages"]) == {
        "mechanics.dynamics.newton-laws",
        "mechanics.kinematics.linear-motion",
    }
    assert all(page["status"] == "construction" for page in manifest["pages"].values())


def test_unchanged_compile_is_a_no_op(tmp_path: Path) -> None:
    output = tmp_path / "bank"
    compile_repository(ROOT, output)
    _, metrics = compile_repository(ROOT, output)
    assert metrics["written"] is False
