from __future__ import annotations

import re

import bleach
import markdown

ALLOWED_TAGS = {
    "p", "br", "em", "strong", "code", "pre", "ul", "ol", "li", "blockquote",
    "span", "div", "table", "thead", "tbody", "tr", "th", "td", "a", "img",
}
ALLOWED_ATTRIBUTES = {
    "*": ["class", "aria-label"],
    "a": ["href", "title", "class", "aria-label"],
    "img": ["src", "alt", "title", "class", "data-plw-asset", "loading", "decoding"],
}
ASSET_SRC_RE = re.compile(r'\ssrc="asset:([a-z][a-z0-9-]{0,31})"')


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
        protocols={"https", "asset"},
        strip=True,
    )
    cleaned = ASSET_SRC_RE.sub(r' data-plw-asset="\1" loading="lazy" decoding="async"', cleaned)
    return bleach.linkifier.Linker(callbacks=[lambda attrs, _new: attrs]).linkify(cleaned)
