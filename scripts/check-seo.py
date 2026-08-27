#!/usr/bin/env python3
"""Validate SEO invariants of the final site and its Markdown sources."""

from __future__ import annotations

import argparse
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse

import yaml
from bs4 import BeautifulSoup


NOINDEX_DIRECTIVES = {"noindex", "none"}
EXCLUDED_OUTPUT_DIRECTORIES = {"superpowers", "adr"}
SITEMAP_FORBIDDEN_ELEMENTS = {"lastmod", "changefreq", "priority"}
FRONTMATTER_RE = re.compile(
    r"\A---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|\Z)",
    re.DOTALL,
)


@dataclass
class SeoReport:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return not self.errors


@dataclass
class HtmlMetadata:
    noindex: bool
    canonical: str | None
    description: str | None


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].casefold()


def _directives(value: object) -> set[str]:
    if not isinstance(value, str):
        return set()
    return {
        directive.casefold()
        for directive in re.split(r"[\s,]+", value)
        if directive
    }


def _has_noindex_directives(directives: set[str]) -> bool:
    return bool(directives & NOINDEX_DIRECTIVES)


def _robots_directives(soup: BeautifulSoup) -> set[str]:
    directives: set[str] = set()
    for meta in soup.find_all("meta"):
        name = meta.get("name")
        if isinstance(name, str) and name.casefold() == "robots":
            directives.update(_directives(meta.get("content", "")))
    return directives


def _canonical_href(soup: BeautifulSoup) -> str | None:
    for link in soup.find_all("link"):
        rel = link.get("rel", [])
        tokens = rel.split() if isinstance(rel, str) else rel
        if any(
            isinstance(token, str) and token.casefold() == "canonical"
            for token in tokens
        ):
            href = link.get("href")
            return href.strip() if isinstance(href, str) else ""
    return None


def _is_absolute_http_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme.casefold() in {"http", "https"} and bool(parsed.netloc)


def _description(soup: BeautifulSoup) -> str | None:
    for meta in soup.find_all("meta"):
        name = meta.get("name")
        if isinstance(name, str) and name.casefold() == "description":
            content = meta.get("content")
            return content.strip() if isinstance(content, str) else None
    return None


def _read_html(path: Path) -> HtmlMetadata:
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    return HtmlMetadata(
        noindex=_has_noindex_directives(_robots_directives(soup)),
        canonical=_canonical_href(soup),
        description=_description(soup),
    )


def _frontmatter_and_body(text: str) -> tuple[dict[object, object], str]:
    match = FRONTMATTER_RE.match(text)
    if match is None:
        return {}, text
    parsed = yaml.safe_load(match.group(1))
    metadata = parsed if isinstance(parsed, dict) else {}
    return metadata, text[match.end() :]


def _source_has_noindex(metadata: dict[object, object]) -> bool:
    meta = metadata.get("meta", [])
    entries = [meta] if isinstance(meta, dict) else meta
    if not isinstance(entries, list):
        return False
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        name = entry.get("name")
        if isinstance(name, str) and name.casefold() == "robots":
            if _has_noindex_directives(_directives(entry.get("content", ""))):
                return True
    return False


def _find_duplicate_descriptions(
    descriptions: dict[str, list[Path]],
) -> list[str]:
    warnings = []
    for description, paths in sorted(descriptions.items()):
        if len(paths) < 2:
            continue
        examples = ", ".join(str(path) for path in paths[:3])
        warnings.append(
            "SEO WARNING: description is shared by "
            f"{len(paths)} indexable pages ({examples})"
        )
    return warnings


def _load_sitemap(path: Path, report: SeoReport) -> list[str]:
    if not path.is_file():
        report.errors.append(f"Missing sitemap: {path}")
        return []

    try:
        root = ET.fromstring(path.read_text(encoding="utf-8"))
    except (OSError, ET.ParseError) as exc:
        report.errors.append(f"Unable to parse sitemap {path}: {exc}")
        return []

    if _local_name(root.tag) != "urlset":
        report.errors.append("Sitemap root element must be urlset")

    forbidden = sorted(
        {
            _local_name(element.tag)
            for element in root.iter()
            if _local_name(element.tag) in SITEMAP_FORBIDDEN_ELEMENTS
        }
    )
    for element in forbidden:
        report.errors.append(f"Sitemap contains forbidden element: <{element}>")

    locs: list[str] = []
    for url_element in root:
        if _local_name(url_element.tag) != "url":
            continue
        for child in url_element:
            if _local_name(child.tag) != "loc":
                continue
            if child.text is None:
                report.errors.append("Sitemap contains an empty loc element")
            else:
                locs.append(child.text)

    duplicates = sorted(url for url, count in Counter(locs).items() if count > 1)
    for url in duplicates:
        report.errors.append(f"Sitemap contains duplicate URL: {url}")
    return locs


def check_seo(site_dir: Path, docs_dir: Path) -> SeoReport:
    report = SeoReport()
    if not site_dir.is_dir():
        report.errors.append(f"Site directory does not exist: {site_dir}")
        return report
    if not docs_dir.is_dir():
        report.errors.append(f"Docs directory does not exist: {docs_dir}")

    expected_canonicals: set[str] = set()
    descriptions: dict[str, list[Path]] = defaultdict(list)
    html_files = sorted(site_dir.rglob("*.html"))
    for html_path in html_files:
        relative_path = html_path.relative_to(site_dir)
        if relative_path.parts and relative_path.parts[0].casefold() in {
            directory.casefold() for directory in EXCLUDED_OUTPUT_DIRECTORIES
        }:
            report.errors.append(
                f"Internal document was built: {relative_path.as_posix()}"
            )

        try:
            metadata = _read_html(html_path)
        except OSError as exc:
            report.errors.append(f"Unable to read HTML {relative_path}: {exc}")
            continue

        if metadata.canonical is not None and not metadata.noindex:
            if not _is_absolute_http_url(metadata.canonical):
                report.errors.append(
                    "Malformed canonical in "
                    f"{relative_path.as_posix()}: {metadata.canonical!r}"
                )
            else:
                expected_canonicals.add(metadata.canonical)

        if not metadata.noindex and metadata.canonical is not None:
            if metadata.description:
                descriptions[metadata.description].append(relative_path)

        if relative_path.as_posix() == "edit-landing/index.html":
            if not metadata.noindex:
                report.errors.append("edit-landing must declare noindex")

    edit_landing = site_dir / "edit-landing" / "index.html"
    if not edit_landing.is_file():
        report.errors.append("edit-landing page is missing from the final site")

    if docs_dir.is_dir():
        for markdown_path in sorted(docs_dir.rglob("*.md")):
            try:
                text = markdown_path.read_text(encoding="utf-8")
                metadata, body = _frontmatter_and_body(text)
            except (OSError, yaml.YAMLError) as exc:
                report.errors.append(f"Unable to inspect source {markdown_path}: {exc}")
                continue
            if re.sub(r"\s+", " ", body).strip() == "TO DO" and not _source_has_noindex(metadata):
                report.errors.append(
                    "Pure TO DO source page lacks explicit noindex: "
                    f"{markdown_path.relative_to(docs_dir).as_posix()}"
                )

    sitemap_locs = _load_sitemap(site_dir / "sitemap.xml", report)
    if set(sitemap_locs) != expected_canonicals:
        missing = sorted(expected_canonicals - set(sitemap_locs))
        unexpected = sorted(set(sitemap_locs) - expected_canonicals)
        report.errors.append(
            "Sitemap canonical set does not match final indexable HTML "
            f"(missing={len(missing)}, unexpected={len(unexpected)})"
        )

    report.warnings.extend(_find_duplicate_descriptions(descriptions))
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate final SEO build invariants.")
    parser.add_argument("--site-dir", type=Path, required=True)
    parser.add_argument("--docs-dir", type=Path, required=True)
    args = parser.parse_args()

    report = check_seo(args.site_dir, args.docs_dir)
    for warning in report.warnings:
        print(warning)
    for error in report.errors:
        print(f"SEO ERROR: {error}", file=sys.stderr)
    if report.errors:
        print(
            f"SEO check failed with {len(report.errors)} error(s).",
            file=sys.stderr,
        )
        return 1
    print("SEO check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
