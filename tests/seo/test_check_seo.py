from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


ROOT = Path(__file__).parents[2]
SCRIPT = ROOT / "scripts" / "check-seo.py"
SPEC = importlib.util.spec_from_file_location("check_seo", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
check_seo = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = check_seo
SPEC.loader.exec_module(check_seo)


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def write_html(
    site: Path,
    relative_path: str,
    *,
    canonical: str | None = None,
    robots: str | None = None,
    description: str | None = None,
) -> None:
    metadata = []
    if canonical is not None:
        metadata.append(f'<link rel="canonical" href="{canonical}">')
    if robots is not None:
        metadata.append(f'<meta name="robots" content="{robots}">')
    if description is not None:
        metadata.append(f'<meta name="description" content="{description}">')
    head = "".join(metadata)
    write_file(site / relative_path, f"<html><head>{head}</head><body></body></html>")


def write_sitemap(site: Path, locs: list[str], extra: str = "") -> None:
    urls = "".join(f"<url><loc>{loc}</loc>{extra}</url>" for loc in locs)
    write_file(
        site / "sitemap.xml",
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"{urls}</urlset>",
    )


def valid_fixture(tmp_path: Path) -> tuple[Path, Path]:
    site = tmp_path / "site"
    docs = tmp_path / "docs"
    docs.mkdir()
    home = "https://example.test/"
    write_html(site, "index.html", canonical=home)
    write_html(
        site,
        "edit-landing/index.html",
        canonical="https://example.test/edit-landing/",
        robots="noindex, follow",
    )
    write_sitemap(site, [home])
    return site, docs


def test_valid_final_site_passes(tmp_path: Path) -> None:
    site, docs = valid_fixture(tmp_path)

    report = check_seo.check_seo(site, docs)

    assert report.errors == []


def test_internal_directories_must_not_be_built(tmp_path: Path) -> None:
    site, docs = valid_fixture(tmp_path)
    write_html(site, "superpowers/plans/plan/index.html")

    report = check_seo.check_seo(site, docs)

    assert any("Internal document was built" in error for error in report.errors)


def test_pure_todo_source_requires_explicit_noindex(tmp_path: Path) -> None:
    site, docs = valid_fixture(tmp_path)
    write_file(docs / "unfinished.md", "TO DO\n")

    report = check_seo.check_seo(site, docs)

    assert any("unfinished.md" in error for error in report.errors)


def test_pure_todo_source_with_noindex_passes(tmp_path: Path) -> None:
    site, docs = valid_fixture(tmp_path)
    write_file(
        docs / "unfinished.md",
        "---\nmeta:\n  - name: robots\n    content: noindex, follow\n---\n\nTO DO\n",
    )

    report = check_seo.check_seo(site, docs)

    assert report.errors == []


def test_edit_landing_requires_noindex(tmp_path: Path) -> None:
    site, docs = valid_fixture(tmp_path)
    write_html(
        site,
        "edit-landing/index.html",
        canonical="https://example.test/edit-landing/",
    )

    report = check_seo.check_seo(site, docs)

    assert any("edit-landing must declare noindex" in error for error in report.errors)


def test_sitemap_must_match_indexable_canonicals(tmp_path: Path) -> None:
    site, docs = valid_fixture(tmp_path)
    write_html(site, "knowledge/index.html", canonical="https://example.test/knowledge/")

    report = check_seo.check_seo(site, docs)

    assert any("Sitemap canonical set" in error for error in report.errors)


def test_sitemap_forbids_dates_priorities_and_duplicates(tmp_path: Path) -> None:
    site, docs = valid_fixture(tmp_path)
    write_sitemap(site, ["https://example.test/", "https://example.test/"], "<lastmod>today</lastmod><priority>1</priority>")

    report = check_seo.check_seo(site, docs)

    assert any("forbidden element" in error for error in report.errors)
    assert any("duplicate URL" in error for error in report.errors)


def test_indexable_malformed_canonical_is_an_error(tmp_path: Path) -> None:
    site, docs = valid_fixture(tmp_path)
    write_html(site, "bad/index.html", canonical="/bad/")

    report = check_seo.check_seo(site, docs)

    assert any("Malformed canonical" in error for error in report.errors)


def test_duplicate_description_is_only_a_warning(tmp_path: Path) -> None:
    site, docs = valid_fixture(tmp_path)
    first = "https://example.test/first/"
    second = "https://example.test/second/"
    write_html(site, "first/index.html", canonical=first, description="shared")
    write_html(site, "second/index.html", canonical=second, description="shared")
    write_sitemap(site, ["https://example.test/", first, second])

    report = check_seo.check_seo(site, docs)

    assert report.errors == []
    assert any("SEO WARNING" in warning for warning in report.warnings)
