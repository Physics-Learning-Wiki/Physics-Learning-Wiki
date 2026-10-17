"""Keep community Markdown out of the trusted site Markdown pipeline."""
from copy import copy
from html import escape
from pathlib import Path
import sys

from mkdocs.plugins import event_priority
from mkdocs.structure.toc import get_toc

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.community.render import render_community_markdown


def is_community(page) -> bool:
    return page.file.src_uri.startswith("community/")


@event_priority(100)
def on_page_markdown(markdown, page, **kwargs):
    if not is_community(page):
        return markdown
    page._plw_community_source = markdown
    return ""


@event_priority(-100)
def on_page_content(html, page, config, files, **kwargs):
    if not is_community(page):
        return html
    rendered = render_community_markdown(
        page._plw_community_source, page=page, config=config, files=files,
    )
    page.toc = get_toc(rendered.toc)
    return '<div class="plw-community-content">' + rendered.html + "</div>"


@event_priority(-100)
def on_page_context(context, page, **kwargs):
    if is_community(page):
        # MkDocs' Jinja environment does not autoescape. Keep metadata plain
        # for hooks/search, and escape a template-only copy for text/attributes.
        template_page = copy(page)
        template_page.meta = {
            key: escape(value, quote=True) if isinstance(value, str) else value
            for key, value in page.meta.items()
        }
        template_page.title = escape(str(page.title), quote=True)
        context["page"] = template_page
    return context
