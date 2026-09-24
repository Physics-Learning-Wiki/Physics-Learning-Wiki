from __future__ import annotations

import json
import os
import posixpath
import re
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


def test_production_build_contains_assessment_cards_and_no_drafts(
    tmp_path: Path,
) -> None:
    site = build_site(tmp_path)
    assert (site / "quiz" / "index.html").exists()
    assert (site / "quiz" / "sets" / "index.html").exists()
    assert (site / "quiz" / "questions" / "index.html").exists()
    assert (site / "quiz" / "contribute" / "index.html").exists()
    assert (site / "quiz" / "play" / "index.html").exists()
    manifest = json.loads(
        (site / "_generated" / "question-bank" / "manifest.json").read_text(
            encoding="utf-8"
        )
    )
    assert manifest["schemaVersion"] == 3
    assert manifest["preview"] is False

    # Published sets exist in manifest and bundle output
    assert "mechanics.dynamics.newton-laws.quick" in manifest["sets"]
    newton_bundle_path = site / "_generated" / "question-bank" / manifest["sets"]["mechanics.dynamics.newton-laws.quick"]["bundle"]
    assert newton_bundle_path.exists()

    # Draft sets must not exist in production manifest or bundle output
    assert "mechanics.kinematics.linear-motion.quick" not in manifest["sets"]
    assert not list((site / "_generated" / "question-bank" / "sets").glob("mechanics.kinematics.linear-motion.*.json"))

    # Newton footer has new Set links and no legacy 24/24 text
    newton = (
        site / "mechanics" / "dynamics" / "newton-laws" / "index.html"
    ).read_text(encoding="utf-8")
    assert "mechanics.dynamics.newton-laws.quick" in newton
    assert "mechanics.dynamics.newton-laws.full" in newton
    assert "24/24" not in newton

    # Linear motion has draft sets, which must NOT leak into production build
    linear = (
        site / "mechanics" / "kinematics" / "linear-motion" / "index.html"
    ).read_text(encoding="utf-8")
    assert "草稿预览入口" not in linear
    assert "mechanics.kinematics.linear-motion" not in linear


def test_preview_build_exposes_drafts_with_warning(tmp_path: Path) -> None:
    site = build_site(tmp_path, preview=True)
    manifest = json.loads(
        (site / "_generated" / "question-bank" / "manifest.json").read_text(
            encoding="utf-8"
        )
    )
    assert manifest["schemaVersion"] == 3
    assert manifest["preview"] is True

    # Draft set bundle exists in preview
    assert "mechanics.kinematics.linear-motion.quick" in manifest["sets"]
    draft_bundle_path = site / "_generated" / "question-bank" / manifest["sets"]["mechanics.kinematics.linear-motion.quick"]["bundle"]
    assert draft_bundle_path.exists()

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

    qb_sets = list((site / "_generated" / "question-bank" / "sets").glob("*.json"))
    assert len(qb_sets) > 0

    newton_bundle = None
    for p in qb_sets:
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
    assert "data-latex" not in stem
    assert "<mjx-assistive-mml" in stem
    assert "<img" not in stem

    # Math CSS is adaptive, versioned, and included only on SSR math pages.
    css_path = site / "assets" / "stylesheets" / "mathjax.css"
    assert css_path.exists()
    css = css_path.read_text(encoding="utf-8")
    assert css_path.stat().st_size <= 768 * 1024
    math_pages = []
    all_markup = []
    for html_path in site.rglob("*.html"):
        html = html_path.read_text(encoding="utf-8")
        all_markup.append(html)
        links = re.findall(r'<link\b[^>]*href="([^"]*mathjax\.css\?hash=[^"]+)"', html)
        css_attr = re.search(r'data-plw-math-css="([^"]*mathjax\.css\?hash=[^"]+)"', html)
        has_math = "<mjx-container" in html
        assert (len(links) == 1) == has_math, html_path.relative_to(site)
        assert bool(css_attr) == has_math, html_path.relative_to(site)
        assert "arithmatex" not in html, html_path.relative_to(site)
        if has_math:
            page_path = html_path.relative_to(site).as_posix()
            href_path, href_query = links[0].split("?", 1)
            resolved_href = posixpath.normpath(posixpath.join(posixpath.dirname(page_path), href_path))
            assert resolved_href == "assets/stylesheets/mathjax.css"
            assert links[0].split("?", 1)[1] == css_attr.group(1).split("?", 1)[1]
            math_pages.append(html)
    assert math_pages

    # The CSS must cover every CHTML glyph used by pages and question-bank bundles.
    question_markup = "".join(
        path.read_text(encoding="utf-8")
        for path in (site / "_generated" / "question-bank").rglob("*.json")
    )
    all_markup.append(question_markup)
    used_glyphs = set(re.findall(r"\bmjx-c([0-9A-Fa-f]+)\b", "".join(all_markup)))
    css_glyphs = set(re.findall(r"\.mjx-c([0-9A-Fa-f]+)\b", css))
    assert used_glyphs
    assert used_glyphs <= css_glyphs, sorted(used_glyphs - css_glyphs)[:20]

    # Production does not ship either client-side MathJax runtime.
    assert not (site / "_static" / "js" / "math-csr.js").exists()
    assert not (site / "assets" / "vendor" / "mathjax").exists()
