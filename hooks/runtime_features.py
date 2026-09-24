"""Add stable page capability markers for the PLW runtime loader."""

from __future__ import annotations

from bs4 import BeautifulSoup

ARTICLE_SELECTOR = "article.md-content__inner.md-typeset"
FEATURE_SELECTORS = (
    ("math", (".arithmatex",)),
    ("mermaid", (".mermaid",)),
    (
        "quiz",
        (
            "#plw-quiz-root",
            "#plw-quiz-sets-root",
            "#plw-quiz-questions-root",
            "#plw-quiz-home-root",
            ".plw-quiz-inline-root",
        ),
    ),
    ("submit", ("#submission-form",)),
    ("question-contribute", ("#plw-question-contribute-form",)),
)
IGNORE_SELECTORS = (
    ".giscus",
    ".page-copyright",
    ".md-status",
    ".md-source-file",
    ".md-content__button",
)


def transform_page_html(output: str) -> str:
    """Mark the article's features and high-noise site UI without changing forms."""
    soup = BeautifulSoup(output, "html.parser")
    article = soup.select_one(ARTICLE_SELECTOR)
    if article is None:
        return output

    features = [
        name
        for name, selectors in FEATURE_SELECTORS
        if any(article.select_one(selector) is not None for selector in selectors)
    ]
    if features:
        article["data-plw-features"] = " ".join(features)
    else:
        article.attrs.pop("data-plw-features", None)
    article["data-pagefind-body"] = ""

    for selector in IGNORE_SELECTORS:
        for element in soup.select(selector):
            element["data-pagefind-ignore"] = "all"

    return str(soup)


def on_post_page(output, page, config, **kwargs):
    del page, config, kwargs
    return transform_page_html(output)
