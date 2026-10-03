"""Add stable page capability markers for the PLW runtime loader."""

from __future__ import annotations

import posixpath
import re
from pathlib import Path

from bs4 import BeautifulSoup

ARTICLE_SELECTOR = "article.md-content__inner.md-typeset"
FEATURE_SELECTORS = (
    ("concept-reference", ("a[data-plw-concept]",)),
    ("math", (".arithmatex",)),
    ("mermaid", (".mermaid",)),
    (
        "quiz",
        (
            "#plw-quiz-root",
            "#plw-quiz-sets-root",
            "#plw-quiz-questions-root",
            "#plw-quiz-library-root",
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
MATH_INLINE = re.compile(r"\\\((.+?)\\\)", re.DOTALL)
MATH_BLOCK = re.compile(r"\\\[(.+?)\\\]", re.DOTALL)
FRAC_MACRO = re.compile(r"\\frac\{([^}]+)\}\{([^}]+)\}")
LATEX_MACROS = re.compile(r"\\[a-zA-Z]+\{([^}]+)\}")
LATEX_COMMANDS = re.compile(r"\\[a-zA-Z]+")
MATH_REPLACEMENTS = {
    "\\to": "->",
    "\\rightarrow": "->",
    "\\times": "*",
    "\\cdot": "*",
    "\\pm": "+/-",
    "\\le": "<=",
    "\\leq": "<=",
    "\\ge": ">=",
    "\\geq": ">=",
    "\\neq": "!=",
    "\\approx": "~",
    "\\sim": "~",
    "\\infty": "inf",
    "\\partial": "d",
}
QUIZ_STYLESHEET = "_static/css/quiz.css?v=5"
FORM_STYLESHEETS = {
    "submit": "_static/css/features/submit.css?v=2",
    "question-contribute": "_static/css/features/question-contribute.css?v=2",
}


def clean_math_content(inner: str) -> str:
    """Reduce TeX to searchable text without changing visible math markup."""
    for command, replacement in MATH_REPLACEMENTS.items():
        inner = re.sub(re.escape(command) + r"(?![a-zA-Z])", replacement, inner)
    for _ in range(3):
        previous = inner
        inner = FRAC_MACRO.sub(r"\1/\2", inner)
        if inner == previous:
            break
    for _ in range(5):
        previous = inner
        inner = LATEX_MACROS.sub(r"\1", inner)
        if inner == previous:
            break
    inner = LATEX_COMMANDS.sub(lambda match: match.group(0)[1:], inner)
    inner = inner.replace("{", "").replace("}", "").replace("\\", " ")
    return re.sub(r"\s+", " ", inner).strip()


def _math_text_for_pagefind(content: str) -> str:
    for pattern in (MATH_BLOCK, MATH_INLINE):
        match = pattern.fullmatch(content)
        if match:
            return clean_math_content(match.group(1))
    return clean_math_content(content[2:-2])


def _replace_search_root(soup: BeautifulSoup) -> bool:
    changed = False
    for root in soup.select('.md-search[data-md-component="search"]'):
        root.attrs.pop("data-md-component", None)
        root["data-plw-component"] = "search"
        changed = True
    return changed


def _page_relative_asset(page_url: str, asset_url: str) -> str:
    if page_url.endswith("/"):
        page_directory = page_url.strip("/")
    else:
        page_directory = posixpath.dirname(page_url)
    asset_path, _, query = asset_url.partition("?")
    relative_path = posixpath.relpath(asset_path, start=page_directory or ".")
    return f"{relative_path}?{query}" if query else relative_path


def transform_page_html(output: str, page_url: str = "", search_metadata=None) -> str:
    """Mark the article's features and high-noise site UI without changing forms."""
    soup = BeautifulSoup(output, "html.parser")
    article = soup.select_one(ARTICLE_SELECTOR)
    if article is not None:
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
        if search_metadata:
            for name, value in search_metadata.items():
                if value:
                    meta = soup.new_tag("meta", attrs={"data-pagefind-meta": f"{name}[content]", "content": value})
                    article.insert(0, meta)

        if "quiz" in features and soup.head is not None:
            stylesheet = _page_relative_asset(page_url, QUIZ_STYLESHEET)
            if not soup.head.select_one(f'link[rel="stylesheet"][href="{stylesheet}"]'):
                soup.head.append(
                    soup.new_tag(
                        "link",
                        rel="stylesheet",
                        href=stylesheet,
                        attrs={"data-plw-feature": "quiz"},
                    )
                )
        if soup.head is not None:
            for feature in ("submit", "question-contribute"):
                if feature not in features:
                    continue
                stylesheet = _page_relative_asset(page_url, FORM_STYLESHEETS[feature])
                if soup.head.select_one(f'link[rel="stylesheet"][href="{stylesheet}"]'):
                    continue
                soup.head.append(
                    soup.new_tag(
                        "link",
                        rel="stylesheet",
                        href=stylesheet,
                        attrs={"data-plw-feature": feature},
                    )
                )

        # Material's built-in Mermaid integration otherwise requests a floating
        # CDN version before the PLW feature loader can load its pinned bundle.
        for diagram in article.select(".mermaid"):
            classes = [name for name in diagram.get("class", []) if name != "mermaid"]
            if classes:
                diagram["class"] = classes
            else:
                diagram.attrs.pop("class", None)
            diagram["data-plw-mermaid-source"] = ""

        for formula in article.select(".arithmatex"):
            formula["data-pagefind-ignore"] = "all"
            searchable_text = _math_text_for_pagefind(formula.get_text())
            if searchable_text:
                index_text = soup.new_tag("span", attrs={"class": "plw-pagefind-math"})
                index_text.string = searchable_text
                formula.insert_after(index_text)

        for selector in IGNORE_SELECTORS:
            for element in soup.select(selector):
                element["data-pagefind-ignore"] = "all"

    _replace_search_root(soup)

    return str(soup)


def on_post_page(output, page, config, **kwargs):
    del config, kwargs
    titles = []
    node = page
    while node is not None:
        title = getattr(node, "title", None)
        if title:
            titles.append(title)
        node = getattr(node, "parent", None)
    path = page.file.src_uri
    if path.startswith("courses/"):
        kind = "课程路线"
    elif path.startswith("intro/") or path.endswith("-writing.md") or path == "submit.md":
        kind = "贡献指南" if any(word in path for word in ("writing", "format", "admonitions", "htc", "submit")) else "站点指南"
    elif path.startswith("quiz/"):
        kind = "知识小测"
    else:
        kind = "知识正文"
    description = page.meta.get("description") or ""
    if not description:
        content = BeautifulSoup(page.content, "html.parser")
        for noise in content.select(".arithmatex, pre, code, .plw-pagefind-math, form, .admonition, details"):
            noise.decompose()
        paragraph = next((p for p in content.select("p") if p.get_text(strip=True)), None)
        description = paragraph.get_text(" ", strip=True)[:180] if paragraph else ""
    metadata = {"breadcrumb": " › ".join(reversed(titles)), "kind": kind, "description": str(description)}
    return transform_page_html(output, getattr(page, "url", ""), metadata)


def on_post_build(config, **kwargs):
    """Rewrite search markup in static theme pages, which have no post_page event."""
    del kwargs
    site_dir = Path(config.get("site_dir", "site"))
    for html_path in site_dir.rglob("*.html"):
        output = html_path.read_text(encoding="utf-8")
        if html_path.name != "404.html" and 'data-md-component="search"' not in output:
            continue
        soup = BeautifulSoup(output, "html.parser")
        changed = _replace_search_root(soup)
        if html_path.name == "404.html":
            for element in soup.select("[data-pagefind-body]"):
                element.attrs.pop("data-pagefind-body", None)
                changed = True
            body = soup.body
            if body is not None:
                if body.get("data-pagefind-ignore") != "all":
                    body["data-pagefind-ignore"] = "all"
                    changed = True
        elif soup.select_one(ARTICLE_SELECTOR) is None:
            body = soup.body
            if body is not None and body.get("data-pagefind-ignore") != "all":
                body["data-pagefind-ignore"] = "all"
                changed = True
        if not changed:
            continue
        html_path.write_text(str(soup), encoding="utf-8")
