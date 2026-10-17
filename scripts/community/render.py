"""The only Markdown/HTML policy used for community page bodies."""
from __future__ import annotations

from dataclasses import dataclass
import html
import re
from urllib.parse import unquote

import bleach
from bs4 import BeautifulSoup
import markdown
from markdown.extensions.toc import slugify_unicode
from mkdocs.structure.pages import _RelativePathTreeprocessor
from pygments.token import STANDARD_TYPES
from pymdownx.arithmatex import arithmatex_fenced_format

from scripts.question_bank.markdown_renderer import mask_markdown_code

TAGS = {
    "p", "br", "em", "strong", "del", "code", "pre", "blockquote",
    "ul", "ol", "li", "dl", "dt", "dd", "table", "thead", "tbody",
    "tr", "th", "td", "h2", "h3", "h4", "hr", "span", "div", "a",
    "img", "sup", "sub", "details", "summary",
}
ADMONITIONS = {
    "note", "abstract", "info", "tip", "success", "question", "warning",
    "failure", "danger", "bug", "example", "quote", "attention", "caution",
    "error", "important",
}
CLASSES = {
    "div": {"arithmatex", "highlight", "admonition", *ADMONITIONS},
    "span": {"arithmatex", "hll", *STANDARD_TYPES.values()},
    "p": {"admonition-title"},
    "details": ADMONITIONS,
}


@dataclass(frozen=True)
class RenderedCommunity:
    html: str
    toc: list[dict]


def normalize_markdown(source: str) -> str:
    """Demote prose ATX headings without altering fenced/inline code or TeX."""
    masked = mask_markdown_code(source)
    masked = re.sub(
        r"(?s)(?<!\\)\$\$.*?(?<!\\)\$\$|\\\[.*?\\\]|\\begin\{([^{}]+)\}.*?\\end\{\1\}",
        lambda match: re.sub(r"[^\r\n]", " ", match.group(0)), masked,
    )
    edits = list(re.finditer(r"(?m)^( {0,3})(#{1,6})(?=[ \t])", masked))
    for match in reversed(edits):
        start, end = match.span(2)
        source = source[:start] + "#" * min(4, max(2, end - start)) + source[end:]
    return source.strip("\r\n")


def _heading_ids(tokens: list[dict]) -> set[str]:
    return {
        item["id"]
        for token in tokens
        for item in [token, *_flatten(token.get("children", []))]
    }


def _flatten(tokens: list[dict]):
    for token in tokens:
        yield token
        yield from _flatten(token.get("children", []))


def render_community_markdown(source: str, *, page=None, files=None, config=None) -> RenderedCommunity:
    # Never inherit the site's extensions: in particular Snippets, attr_list,
    # md_in_html, concept/quiz extensions and Mermaid cannot run on this input.
    md = markdown.Markdown(
        extensions=[
            "tables", "def_list", "admonition", "toc", "pymdownx.details",
            "pymdownx.superfences", "pymdownx.arithmatex",
        ],
        extension_configs={
            "toc": {"slugify": lambda value, sep: "community-" + slugify_unicode(value, sep)},
            "pymdownx.arithmatex": {"generic": True},
            "pymdownx.superfences": {"custom_fences": [{
                "name": "math", "class": "arithmatex",
                "format": arithmatex_fenced_format(mode="generic"),
            }]},
        },
    )
    rendered = md.convert(normalize_markdown(source))
    tokens = getattr(md, "toc_tokens", [])
    heading_ids = _heading_ids(tokens)
    soup = BeautifulSoup(rendered, "html.parser")
    for heading in soup.find_all(["h1", "h5", "h6"]):
        heading.name = "h2" if heading.name == "h1" else "h4"

    anchors = {value.removeprefix("community-"): value for value in heading_ids}
    for link in soup.find_all("a", href=True):
        target = unquote(link["href"][1:]) if link["href"].startswith("#") else ""
        if target in anchors and target not in heading_ids:
            link["href"] = "#" + anchors[target]

    if page is not None:
        # MkDocs 1.5.3 is pinned. Apply its resolver once to both Markdown links
        # and raw HTML links, including links in the generated community index.
        resolver = _RelativePathTreeprocessor(page.file, files, config)
        for node in soup.find_all(["a", "img"]):
            key = "href" if node.name == "a" else "src"
            if node.has_attr(key):
                node[key] = resolver.path_to_url(node[key])

    def allow_attribute(tag: str, name: str, value: str) -> bool:
        if name == "id":
            return tag in {"h2", "h3", "h4"} and value in heading_ids
        if name == "class":
            classes = value.split()
            if tag == "code":
                return bool(classes) and all(re.fullmatch(r"language-[\w+-]+", item) for item in classes)
            return bool(classes) and set(classes) <= CLASSES.get(tag, set())
        if tag == "a":
            return name in {"href", "title"}
        if tag == "img":
            return name in {"src", "alt", "title"} or (
                name in {"width", "height"} and bool(re.fullmatch(r"[1-9]\d{0,3}", value))
            )
        if tag == "details":
            return name == "open"
        if tag in {"th", "td"}:
            return name in {"colspan", "rowspan"} and bool(re.fullmatch(r"[1-9]\d?", value))
        if tag == "ol":
            return name == "start" and bool(re.fullmatch(r"[0-9]{1,6}", value))
        return False

    cleaned = bleach.clean(
        str(soup), tags=TAGS, attributes=allow_attribute,
        protocols={"http", "https", "mailto"}, strip=True, strip_comments=True,
    )
    # TOC labels are rendered by the theme separately from page.content.
    def clean_toc(items: list[dict]) -> list[dict]:
        return [{
            **item,
            "name": html.escape(BeautifulSoup(item["name"], "html.parser").get_text(), quote=True),
            "children": clean_toc(item.get("children", [])),
        } for item in items if item["id"] in heading_ids]

    return RenderedCommunity(cleaned, clean_toc(tokens))
