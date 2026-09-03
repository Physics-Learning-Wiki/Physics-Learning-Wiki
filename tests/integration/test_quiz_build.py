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
        environment.pop("GITHUB_ACTIONS", None)
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


def test_production_build_renders_question_bank_math_ssr(tmp_path: Path) -> None:
    site = build_site(tmp_path)
    env = os.environ.copy()
    env["SITE_DIR"] = str(site)
    subprocess.run(
        [
            "node",
            "--loader",
            "ts-node/esm",
            str(ROOT / "scripts" / "post-build" / "html-postprocess.ts"),
            "math",
        ],
        cwd=ROOT,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )

    qb_pages = list((site / "_generated" / "question-bank" / "pages").glob("*.json"))
    assert len(qb_pages) > 0

    newton_bundle = None
    for p in qb_pages:
        if "newton-laws" in p.name:
            newton_bundle = json.loads(p.read_text(encoding="utf-8"))
            break
    assert newton_bundle is not None

    q2 = next(
        q for q in newton_bundle["questions"] if q["id"] == "mech-dyn-newton-0002"
    )
    stem = q2["stemHtml"]
    sol = q2["solutionHtml"]

    assert "arithmatex" not in stem
    assert "arithmatex" not in sol
    assert "<mjx-container" in stem
    assert "<mjx-container" in sol
    assert "<mjx-math" in stem
    assert "<mjx-math" in sol
    assert r"\(" not in stem
    assert r"\)" not in stem
    assert r"\(" not in sol
    assert r"\)" not in sol
    assert "2\\,\\mathrm{kg}" in stem

    # Verify assets/stylesheets/mathjax.css was generated
    assert (site / "assets" / "stylesheets" / "mathjax.css").exists()
    # Verify math-csr.js was removed from production site
    assert not (site / "_static" / "js" / "math-csr.js").exists()
