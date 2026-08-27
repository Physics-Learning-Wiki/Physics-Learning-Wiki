from __future__ import annotations

import importlib.util
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest


ROOT = Path(__file__).parents[2]
SCRIPT = ROOT / "scripts" / "post-build" / "seo" / "generate-sitemap.py"
SPEC = importlib.util.spec_from_file_location("generate_sitemap", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
generate_sitemap = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(generate_sitemap)


def write_page(site: Path, relative_path: str, html: str) -> None:
    page = site / relative_path
    page.parent.mkdir(parents=True, exist_ok=True)
    page.write_text(html, encoding="utf-8")


def page(*, canonical: str | None = None, robots: str | None = None) -> str:
    metadata = []
    if canonical is not None:
        metadata.append(f'<link rel="canonical" href="{canonical}">')
    if robots is not None:
        metadata.append(f'<meta name="robots" content="{robots}">')
    head = "".join(metadata)
    return f"<html><head>{head}</head><body></body></html>"


def read_locs(sitemap: Path) -> list[str]:
    root = ET.fromstring(sitemap.read_text(encoding="utf-8"))
    namespace = {"sm": generate_sitemap.SITEMAP_NAMESPACE}
    return [element.text for element in root.findall("sm:url/sm:loc", namespace)]


def test_collects_normal_canonical_page(tmp_path: Path) -> None:
    site = tmp_path / "site"
    url = "https://example.test/normal/"
    write_page(site, "normal/index.html", page(canonical=url))

    output = site / "sitemap.xml"
    assert generate_sitemap.generate_sitemap(site, output) == {url}
    assert read_locs(output) == [url]


@pytest.mark.parametrize("robots", ["noindex, follow", "INDEX, NoInDeX", "NONE"])
def test_excludes_noindex_robots_directives(tmp_path: Path, robots: str) -> None:
    site = tmp_path / "site"
    write_page(
        site,
        "excluded/index.html",
        page(canonical="https://example.test/excluded/", robots=robots),
    )

    output = site / "sitemap.xml"
    assert generate_sitemap.generate_sitemap(site, output) == set()
    assert read_locs(output) == []


def test_excludes_redirect_with_noindex(tmp_path: Path) -> None:
    site = tmp_path / "site"
    write_page(
        site,
        "old/index.html",
        '<link rel="canonical" href="https://example.test/old/">'
        '<meta name="robots" content="noindex">',
    )

    output = site / "sitemap.xml"
    assert generate_sitemap.generate_sitemap(site, output) == set()


def test_excludes_page_without_canonical(tmp_path: Path) -> None:
    site = tmp_path / "site"
    write_page(site, "uncanonical/index.html", page())

    output = site / "sitemap.xml"
    assert generate_sitemap.generate_sitemap(site, output) == set()


def test_rejects_non_absolute_canonical(tmp_path: Path) -> None:
    site = tmp_path / "site"
    write_page(site, "invalid/index.html", page(canonical="/invalid/"))

    with pytest.raises(ValueError, match="Invalid canonical URL"):
        generate_sitemap.generate_sitemap(site, site / "sitemap.xml")


def test_deduplicates_canonicals_and_sorts_output(tmp_path: Path) -> None:
    site = tmp_path / "site"
    canonical = "https://example.test/shared/"
    write_page(site, "z/index.html", page(canonical=canonical))
    write_page(site, "a/index.html", page(canonical="https://example.test/a/"))
    write_page(site, "duplicate/index.html", page(canonical=canonical))

    output = site / "sitemap.xml"
    generate_sitemap.generate_sitemap(site, output)

    assert read_locs(output) == [
        "https://example.test/a/",
        "https://example.test/shared/",
    ]


def test_sitemap_is_loc_only_xml(tmp_path: Path) -> None:
    site = tmp_path / "site"
    write_page(site, "page/index.html", page(canonical="https://example.test/page/"))
    output = site / "sitemap.xml"
    generate_sitemap.generate_sitemap(site, output)

    text = output.read_text(encoding="utf-8")
    assert text.startswith('<?xml version="1.0" encoding="UTF-8"?>')
    assert "<urlset" in text
    assert "<loc>https://example.test/page/</loc>" in text
    assert all(tag not in text for tag in ("<lastmod>", "<changefreq>", "<priority>"))
