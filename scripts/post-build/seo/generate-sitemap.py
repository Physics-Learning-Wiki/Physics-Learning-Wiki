#!/usr/bin/env python3
"""Generate a sitemap from the canonical and robots metadata in built HTML."""

from __future__ import annotations

import argparse
import re
from html import escape
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse

from bs4 import BeautifulSoup


ROBOTS_META_NAME = "robots"
NOINDEX_DIRECTIVES = {"noindex", "none"}
SITEMAP_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9"


def _robots_directives(soup: BeautifulSoup) -> set[str]:
    directives: set[str] = set()
    for meta in soup.find_all("meta"):
        name = meta.get("name")
        if not isinstance(name, str) or name.casefold() != ROBOTS_META_NAME:
            continue
        content = meta.get("content", "")
        if isinstance(content, str):
            directives.update(
                directive.casefold()
                for directive in re.split(r"[\s,]+", content)
                if directive
            )
    return directives


def _has_noindex(soup: BeautifulSoup) -> bool:
    return bool(_robots_directives(soup) & NOINDEX_DIRECTIVES)


def _canonical_href(soup: BeautifulSoup) -> str | None:
    for link in soup.find_all("link"):
        rel = link.get("rel", [])
        rel_tokens = rel.split() if isinstance(rel, str) else rel
        if not any(
            isinstance(token, str) and token.casefold() == "canonical"
            for token in rel_tokens
        ):
            continue
        href = link.get("href")
        return href.strip() if isinstance(href, str) else ""
    return None


def _validate_canonical(url: str, html_path: Path) -> str:
    parsed = urlparse(url)
    if parsed.scheme.casefold() not in {"http", "https"} or not parsed.netloc:
        raise ValueError(
            f"Invalid canonical URL in {html_path}: {url!r}; "
            "expected an absolute http(s) URL"
        )
    return url


def collect_indexable_canonicals(site_dir: Path) -> set[str]:
    """Return canonical URLs from indexable HTML below *site_dir*."""

    if not site_dir.is_dir():
        raise FileNotFoundError(f"Site directory does not exist: {site_dir}")

    canonicals: set[str] = set()
    for html_path in sorted(site_dir.rglob("*.html")):
        soup = BeautifulSoup(html_path.read_text(encoding="utf-8"), "html.parser")
        if _has_noindex(soup):
            continue

        canonical = _canonical_href(soup)
        if canonical is None:
            continue
        canonicals.add(_validate_canonical(canonical, html_path))

    return canonicals


def render_sitemap(canonicals: Iterable[str]) -> str:
    """Render a deterministic loc-only sitemap."""

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<urlset xmlns="{SITEMAP_NAMESPACE}">',
    ]
    for canonical in sorted(set(canonicals)):
        lines.extend(
            [
                "  <url>",
                f"    <loc>{escape(canonical)}</loc>",
                "  </url>",
            ]
        )
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def generate_sitemap(site_dir: Path, output: Path) -> set[str]:
    """Generate *output* from the final HTML under *site_dir*."""

    canonicals = collect_indexable_canonicals(site_dir)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="\n") as output_file:
        output_file.write(render_sitemap(canonicals))
    return canonicals


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate a loc-only sitemap from final HTML metadata."
    )
    parser.add_argument("--site-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    generate_sitemap(args.site_dir, args.output)


if __name__ == "__main__":
    main()
