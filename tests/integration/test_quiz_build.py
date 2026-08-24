from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parents[2]


def build_site(tmp_path: Path, *, preview: bool = False) -> Path:
    destination = tmp_path / ("preview-site" if preview else "production-site")
    environment = os.environ.copy()
    environment.pop("PLW_QUIZ_PREVIEW", None)
    if preview:
        environment["PLW_QUIZ_PREVIEW"] = "1"
    subprocess.run(
        [
            sys.executable,
            "-m",
            "mkdocs",
            "build",
            "--clean",
            "--site-dir",
            str(destination),
        ],
        cwd=ROOT,
        env=environment,
        check=True,
        capture_output=True,
        text=True,
    )
    return destination


def test_production_build_contains_construction_cards_and_no_drafts(
    tmp_path: Path,
) -> None:
    site = build_site(tmp_path)
    assert (site / "quiz" / "index.html").exists()
    manifest = json.loads(
        (site / "_generated" / "question-bank" / "manifest.json").read_text(
            encoding="utf-8"
        )
    )
    assert manifest["preview"] is False
    assert all(page["status"] == "construction" for page in manifest["pages"].values())
    linear = (
        site / "mechanics" / "kinematics" / "linear-motion" / "index.html"
    ).read_text(encoding="utf-8")
    newton = (site / "mechanics" / "dynamics" / "newton-laws" / "index.html").read_text(
        encoding="utf-8"
    )
    ordinary = (site / "mechanics" / "index.html").read_text(encoding="utf-8")
    assert "plw-quiz-entry--building" in linear
    assert "plw-quiz-entry--building" in newton
    assert "plw-quiz-entry" not in ordinary
    json_text = "".join(
        path.read_text(encoding="utf-8")
        for path in (site / "_generated" / "question-bank").rglob("*.json")
    )
    assert "mech-kin-linear-0001" not in json_text
    assert "mech-dyn-newton-0001" not in json_text
    assert "mech-kin-linear-0001" not in (
        site / "search" / "search_index.json"
    ).read_text(encoding="utf-8")


def test_preview_build_exposes_drafts_with_warning(tmp_path: Path) -> None:
    site = build_site(tmp_path, preview=True)
    manifest = json.loads(
        (site / "_generated" / "question-bank" / "manifest.json").read_text(
            encoding="utf-8"
        )
    )
    assert manifest["preview"] is True
    linear = (
        site / "mechanics" / "kinematics" / "linear-motion" / "index.html"
    ).read_text(encoding="utf-8")
    assert "草稿预览入口" in linear
    assert 'class="md-button" data-no-instant' in linear
    json_text = "".join(
        path.read_text(encoding="utf-8")
        for path in (site / "_generated" / "question-bank").rglob("*.json")
    )
    assert "mech-kin-linear-0001" in json_text
