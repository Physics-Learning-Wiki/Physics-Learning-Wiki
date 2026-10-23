from __future__ import annotations

import json
import posixpath
import re
from pathlib import Path


def test_production_build_contains_quiz_pages_and_no_drafts(
    built_site: Path, site_html, question_bank_source_ids,
) -> None:
    site = built_site
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
        _, quiz_soup = site_html[site / relative_path]
        article = quiz_soup.select_one("article.md-content__inner.md-typeset")
        assert article is not None
        assert article.get("data-plw-features") == "quiz"
        quiz_stylesheets = quiz_soup.select('link[rel~="stylesheet"][data-plw-feature="quiz"]')
        assert len(quiz_stylesheets) == 1
        # minify-html may omit <head>; these links must still precede the body.
        assert quiz_stylesheets[0].find_parent("body") is None
        stylesheet_path = quiz_stylesheets[0]["href"].split("?", 1)[0]
        page_directory = posixpath.dirname(relative_path.rstrip("/"))
        assert posixpath.normpath(posixpath.join(page_directory, stylesheet_path)) == "_static/css/quiz.css"
        assert not quiz_soup.select('script[src*="quiz-app.js"]')

    _, ordinary_soup = site_html[site / "intro" / "about" / "index.html"]
    assert not ordinary_soup.select('link[data-plw-feature="quiz"]')
    assert not ordinary_soup.select('script[src*="/features/quiz.js"]')

    bank = site / "_generated" / "question-bank"
    manifest = json.loads((bank / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["schemaVersion"] == 3
    assert manifest["preview"] is False

    published_sets = question_bank_source_ids.get(("sets", "published"), set())
    draft_sets = question_bank_source_ids.get(("sets", "draft"), set())
    assert set(manifest["sets"]) == published_sets
    assert draft_sets.isdisjoint(manifest["sets"])
    for entry in manifest["sets"].values():
        assert (bank / entry["bundle"]).exists()
    questions = json.loads((bank / manifest["catalogs"]["questions"]).read_text(encoding="utf-8"))
    question_ids = {question["id"] for question in questions}
    assert question_ids == question_bank_source_ids.get(("questions", "published"), set())
    assert question_bank_source_ids.get(("questions", "draft"), set()).isdisjoint(question_ids)


def test_production_build_renders_question_bank_math_ssr(built_site: Path, site_html) -> None:
    site = built_site
    assert (site / "pagefind" / "pagefind.js").exists()
    assert not (site / "search" / "search_index.json").exists()
    assert not (site / "search" / "search_index.js").exists()
    _, home = site_html[site / "index.html"]
    assert home.html is not None
    assert home.html.get("lang") == "zh-Hans"

    search_ui_pages = []
    for html_path, (html, soup) in site_html.items():
        if "md-search" not in html:
            continue
        search = soup.select_one(".md-search")
        assert search is not None
        assert search.get("data-plw-component") == "search"
        assert not search.has_attr("data-md-component")
        assert search.select_one(".md-search__input") is not None
        assert search.select_one(".md-search-result") is not None
        assert not soup.select('script[src*="pagefind"]')
        assert not soup.select('[data-md-component="search"]')
        if html_path.name == "404.html":
            assert not soup.select_one("[data-pagefind-body]")
            assert soup.body is not None
            assert soup.body.get("data-pagefind-ignore") == "all"
        search_ui_pages.append(html_path)
    assert any(path.name == "404.html" for path in search_ui_pages)

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

    # Inspect the final minified DOM: attribute quoting is not a page contract.
    css_path = site / "assets" / "stylesheets" / "mathjax.css"
    assert css_path.exists()
    css = css_path.read_text(encoding="utf-8")
    assert css_path.stat().st_size <= 768 * 1024
    math_pages = []
    all_markup = []
    for html_path, (html, soup) in site_html.items():
        all_markup.append(html)
        links = [str(link["href"]) for link in soup.select("link[href]")
                 if "mathjax.css?hash=" in str(link["href"])]
        article = soup.select_one("article.md-content__inner.md-typeset")
        css_attr = article.get("data-plw-math-css") if article is not None else None
        has_math = soup.find("mjx-container") is not None
        features = str(article.get("data-plw-features", "")).split() if article is not None else []
        needs_math_contract = has_math or bool({"quiz", "quiz-set-contribute"}.intersection(features))
        assert (len(links) == 1) == has_math, html_path.relative_to(site)
        assert bool(css_attr) == needs_math_contract, html_path.relative_to(site)
        assert "arithmatex" not in html, html_path.relative_to(site)
        if has_math:
            page_path = html_path.relative_to(site).as_posix()
            href_path, href_query = links[0].split("?", 1)
            resolved_href = posixpath.normpath(posixpath.join(posixpath.dirname(page_path), href_path))
            assert resolved_href == "assets/stylesheets/mathjax.css"
            assert href_query == css_attr.split("?", 1)[1]
            math_pages.append(html)
    assert math_pages

    # Keep coverage of every CHTML glyph, including question-bank bundle math.
    question_markup = "".join(
        path.read_text(encoding="utf-8")
        for path in (site / "_generated" / "question-bank").rglob("*.json")
    )
    all_markup.append(question_markup)
    used_glyphs = set(re.findall(r"\bmjx-c([0-9A-Fa-f]+)\b", "".join(all_markup)))
    css_glyphs = set(re.findall(r"\.mjx-c([0-9A-Fa-f]+)\b", css))
    assert used_glyphs
    assert used_glyphs <= css_glyphs, sorted(used_glyphs - css_glyphs)[:20]
    assert not (site / "_static" / "js" / "math-csr.js").exists()
    assert not (site / "assets" / "vendor" / "mathjax").exists()
