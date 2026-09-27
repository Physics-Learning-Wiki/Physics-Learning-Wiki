from __future__ import annotations

import json
import os
import posixpath
import re
import subprocess
import sys
from pathlib import Path

from bs4 import BeautifulSoup
from scripts.question_bank.loader import load_tree

ROOT = Path(__file__).parents[2]


def source_ids(kind: str, status: str) -> set[str]:
    documents, issues = load_tree(ROOT / "question-bank" / kind)
    assert not issues
    return {str(doc.data["id"]) for doc in documents if doc.data.get("status") == status}


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


def build_pagefind_index(site: Path) -> None:
    subprocess.run(
        [
            "node",
            str(ROOT / "node_modules" / "pagefind" / "lib" / "runner" / "bin.cjs"),
            "--site",
            str(site),
        ],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )


def test_production_build_contains_quiz_pages_and_no_drafts(
    tmp_path: Path,
) -> None:
    site = build_site(tmp_path)
    assert (site / "quiz" / "index.html").exists()
    assert (site / "quiz" / "sets" / "index.html").exists()
    assert (site / "quiz" / "questions" / "index.html").exists()
    assert (site / "quiz" / "contribute" / "index.html").exists()
    assert (site / "quiz" / "play" / "index.html").exists()
    quiz_bundle = site / "_static" / "js" / "features" / "quiz.js"
    assert quiz_bundle.exists()
    assert "export" in quiz_bundle.read_text(encoding="utf-8")
    assert not (site / "_static" / "js" / "quiz-app.js").exists()

    for relative_path in (
        "quiz/index.html",
        "quiz/sets/index.html",
        "quiz/questions/index.html",
        "quiz/play/index.html",
    ):
        quiz_html = (site / relative_path).read_text(encoding="utf-8")
        quiz_soup = BeautifulSoup(quiz_html, "html.parser")
        article = quiz_soup.select_one("article.md-content__inner.md-typeset")
        assert article is not None
        assert article.get("data-plw-features") == "quiz"
        quiz_stylesheets = quiz_soup.select('head link[data-plw-feature="quiz"]')
        assert len(quiz_stylesheets) == 1
        stylesheet_path = quiz_stylesheets[0]["href"].split("?", 1)[0]
        page_directory = posixpath.dirname(relative_path.rstrip("/"))
        assert posixpath.normpath(posixpath.join(page_directory, stylesheet_path)) == "_static/css/quiz.css"
        assert not quiz_soup.select('script[src*="quiz-app.js"]')

    ordinary_soup = BeautifulSoup(
        (site / "intro" / "about" / "index.html").read_text(encoding="utf-8"), "html.parser"
    )
    assert not ordinary_soup.select('head link[data-plw-feature="quiz"]')
    assert not ordinary_soup.select('script[src*="/features/quiz.js"]')

    manifest = json.loads(
        (site / "_generated" / "question-bank" / "manifest.json").read_text(
            encoding="utf-8"
        )
    )
    assert manifest["schemaVersion"] == 3
    assert manifest["preview"] is False

    bank = site / "_generated" / "question-bank"
    published_sets = source_ids("sets", "published")
    draft_sets = source_ids("sets", "draft")
    assert set(manifest["sets"]) == published_sets
    assert draft_sets.isdisjoint(manifest["sets"])
    for entry in manifest["sets"].values():
        assert (bank / entry["bundle"]).exists()
    questions = json.loads((bank / manifest["catalogs"]["questions"]).read_text(encoding="utf-8"))
    assert {question["id"] for question in questions} == source_ids("questions", "published")
    assert source_ids("questions", "draft").isdisjoint({question["id"] for question in questions})


def test_preview_build_exposes_drafts(tmp_path: Path) -> None:
    site = build_site(tmp_path, preview=True)
    manifest = json.loads(
        (site / "_generated" / "question-bank" / "manifest.json").read_text(
            encoding="utf-8"
        )
    )
    assert manifest["schemaVersion"] == 3
    assert manifest["preview"] is True

    bank = site / "_generated" / "question-bank"
    draft_sets = source_ids("sets", "draft")
    assert draft_sets, "fixture requires at least one draft set"
    assert draft_sets <= set(manifest["sets"])
    for set_id in draft_sets:
        assert (bank / manifest["sets"][set_id]["bundle"]).exists()
    questions = json.loads((bank / manifest["catalogs"]["questions"]).read_text(encoding="utf-8"))
    draft_questions = source_ids("questions", "draft")
    assert draft_questions, "fixture requires at least one draft question"
    assert draft_questions <= {question["id"] for question in questions}



def test_production_build_renders_question_bank_math_ssr(tmp_path: Path) -> None:
    site = build_site(tmp_path)
    build_pagefind_index(site)

    assert (site / "pagefind" / "pagefind.js").exists()
    assert not (site / "search" / "search_index.json").exists()
    assert not (site / "search" / "search_index.js").exists()
    assert re.search(r'<html[^>]*\blang="zh"', (site / "index.html").read_text(encoding="utf-8"))

    search_ui_pages = []
    for html_path in site.rglob("*.html"):
        html = html_path.read_text(encoding="utf-8")
        if "md-search" not in html:
            continue
        soup = BeautifulSoup(html, "html.parser")
        search = soup.select_one(".md-search")
        assert search is not None
        assert search.get("data-plw-component") == "search"
        assert not search.has_attr("data-md-component")
        assert search.select_one(".md-search__input") is not None
        assert search.select_one(".md-search-result") is not None
        assert not soup.select('script[src*="pagefind"]')
        assert 'data-md-component="search"' not in html
        if html_path.name == "404.html":
            assert not soup.select_one("[data-pagefind-body]")
            assert soup.body is not None
            assert soup.body.get("data-pagefind-ignore") == "all"
        search_ui_pages.append(html_path)
    assert any(path.name == "404.html" for path in search_ui_pages)

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

    math_question = next(
        (
            question
            for bundle_path in qb_sets
            for question in json.loads(bundle_path.read_text(encoding="utf-8"))["questions"]
            if "<mjx-container" in question["stemHtml"]
            and "<mjx-container" in question["solutionHtml"]
        ),
        None,
    )
    assert math_question is not None, "fixture requires a published question with stem and solution math"
    stem = math_question["stemHtml"]
    sol = math_question["solutionHtml"]

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
        has_quiz = bool(re.search(r'data-plw-features="[^"]*\bquiz\b[^"]*"', html))
        needs_math_contract = has_math or has_quiz
        assert (len(links) == 1) == has_math, html_path.relative_to(site)
        assert bool(css_attr) == needs_math_contract, html_path.relative_to(site)
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
