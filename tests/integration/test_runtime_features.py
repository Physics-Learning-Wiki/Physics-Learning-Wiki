from __future__ import annotations

from bs4 import BeautifulSoup

from hooks.runtime_features import transform_page_html


def page_html(content: str, after_article: str = "") -> str:
    return (
        "<!doctype html><html><head><title>Runtime test</title></head><body>"
        f'<article class="md-content__inner md-typeset">{content}</article>'
        f"{after_article}</body></html>"
    )


def test_ordinary_article_gets_pagefind_body_without_feature_markers() -> None:
    result = BeautifulSoup(transform_page_html(page_html("<p>普通文章</p>")), "html.parser")
    article = result.select_one("article.md-content__inner.md-typeset")

    assert article is not None
    assert article.has_attr("data-pagefind-body")
    assert not article.has_attr("data-plw-features")


def test_feature_selectors_are_detected_once_in_stable_order() -> None:
    markup = page_html(
        """
        <span class="arithmatex">\\(x\\)</span>
        <pre class="mermaid">graph TD; A --> B;</pre>
        <div id="plw-quiz-root"></div>
        <div class="plw-quiz-inline-root"></div>
        <form id="submission-form"></form>
        <form id="plw-question-contribute-form"></form>
        """
    )
    first = transform_page_html(markup)
    second = transform_page_html(markup)
    result = BeautifulSoup(first, "html.parser")
    article = result.select_one("article.md-content__inner.md-typeset")

    assert article is not None
    assert article.get("data-plw-features") == "math mermaid quiz submit question-contribute"
    assert first == second


def test_quiz_root_variants_all_mark_the_quiz_feature() -> None:
    roots = (
        '<div id="plw-quiz-root"></div>',
        '<div id="plw-quiz-sets-root"></div>',
        '<div id="plw-quiz-questions-root"></div>',
        '<div id="plw-quiz-home-root"></div>',
        '<div class="plw-quiz-inline-root"></div>',
    )
    for root in roots:
        result = BeautifulSoup(transform_page_html(page_html(root)), "html.parser")
        article = result.select_one("article.md-content__inner.md-typeset")
        assert article is not None
        assert article.get("data-plw-features") == "quiz"


def test_high_noise_site_ui_is_ignored_but_forms_are_not_expanded() -> None:
    markup = page_html(
        '<form id="submission-form"><input name="message"></form>',
        """
        <div class="giscus"></div>
        <div class="page-copyright"></div>
        <div class="md-status"></div>
        <div class="md-source-file"></div>
        <button class="md-content__button">Edit</button>
        """,
    )
    result = BeautifulSoup(transform_page_html(markup), "html.parser")

    for selector in (".giscus", ".page-copyright", ".md-status", ".md-source-file", ".md-content__button"):
        element = result.select_one(selector)
        assert element is not None
        assert element.get("data-pagefind-ignore") == "all"
    assert result.select_one("form#submission-form") is not None
    assert result.select_one("form#submission-form").get("data-pagefind-ignore") is None


def test_static_template_without_article_is_unchanged() -> None:
    output = "<!doctype html><html><body><div class='md-search'></div></body></html>"
    assert transform_page_html(output) == output
