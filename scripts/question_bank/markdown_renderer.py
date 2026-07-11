from __future__ import annotations

import bleach
import markdown

ALLOWED_TAGS = {
    "p", "br", "em", "strong", "code", "pre", "ul", "ol", "li", "blockquote",
    "span", "div", "table", "thead", "tbody", "tr", "th", "td", "a",
}
ALLOWED_ATTRIBUTES = {"*": ["class", "aria-label"], "a": ["href", "title", "class", "aria-label"]}


def _allow_url(value: str) -> str:
    stripped = value.strip()
    if stripped.startswith(("https://", "./", "../", "#", "/")):
        return stripped
    return "#"


def render_markdown(source: str) -> str:
    rendered = markdown.markdown(
        source,
        extensions=["pymdownx.arithmatex"],
        extension_configs={"pymdownx.arithmatex": {"generic": True}},
    )
    cleaned = bleach.clean(
        rendered,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols={"https"},
        strip=True,
    )
    return bleach.linkifier.Linker(callbacks=[lambda attrs, _new: attrs]).linkify(cleaned)
