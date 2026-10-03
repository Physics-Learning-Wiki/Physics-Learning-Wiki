"""Resolve explicit concept references without scanning prose for keywords."""

from __future__ import annotations

import html
import json
import posixpath
import re
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from urllib.parse import quote, unquote, urlsplit

import yaml
from bs4 import BeautifulSoup
from markdown.extensions import Extension
from markdown.treeprocessors import Treeprocessor
from mkdocs.exceptions import PluginError
from mkdocs.utils import get_relative_url

ID = re.compile(r"[a-z][a-z0-9]*(?:-[a-z0-9]+)*\Z")
GLOSSARY_MARKER = re.compile(r"\s*<!--\s*plw:glossary-entry\s+(\S+)\s*-->\s*\Z")


class UniqueKeyLoader(yaml.SafeLoader):
    """Reject duplicate YAML keys before a dict can silently overwrite them."""

    def construct_mapping(self, node, deep=False):
        result = {}
        for key_node, value_node in node.value:
            key = self.construct_object(key_node, deep=deep)
            if not isinstance(key, str):
                raise PluginError(f"concepts: YAML keys must be strings at {key_node.start_mark}")
            if key in result:
                raise PluginError(f"concepts: duplicate key {key!r} at {key_node.start_mark}")
            result[key] = self.construct_object(value_node, deep=deep)
        return result


@dataclass(frozen=True)
class Concept:
    name: str
    summary: str
    target: str
    english: str = ""
    aliases: tuple[str, ...] = ()


def load_registry(path: Path) -> dict[str, Concept]:
    try:
        document = yaml.load(path.read_text(encoding="utf-8"), Loader=UniqueKeyLoader)
    except (OSError, yaml.YAMLError) as exc:
        raise PluginError(f"{path}: {exc}") from exc
    if not isinstance(document, dict) or type(document.get("version")) is not int or document["version"] != 1:
        raise PluginError(f"{path}: expected version: 1")
    entries = document.get("concepts")
    if not isinstance(entries, dict):
        raise PluginError(f"{path}: concepts must be a mapping")
    result = {}
    for concept_id, entry in entries.items():
        prefix = f"{path}: concept {concept_id!r}"
        if not ID.fullmatch(concept_id) or not isinstance(entry, dict):
            raise PluginError(f"{prefix}: invalid ID or entry")
        if set(entry) - {"name", "summary", "target", "english", "aliases"}:
            raise PluginError(f"{prefix}: unknown fields")
        for key in ("name", "summary", "target"):
            if not isinstance(entry.get(key), str) or not entry[key].strip():
                raise PluginError(f"{prefix}: {key} must be a nonempty string")
        if "english" in entry and (not isinstance(entry["english"], str) or not entry["english"].strip()):
            raise PluginError(f"{prefix}: english must be a nonempty string")
        aliases = entry.get("aliases", [])
        if not isinstance(aliases, list) or any(not isinstance(a, str) or not a.strip() for a in aliases):
            raise PluginError(f"{prefix}: aliases must be a list of nonempty strings")
        target = urlsplit(entry["target"])
        if (target.scheme or target.netloc or target.query or not target.path.endswith(".md")
                or target.path.startswith("/") or "\\" in target.path
                or ".." in PurePosixPath(unquote(target.path)).parts):
            raise PluginError(f"{prefix}: target must be a docs-relative .md path with an optional anchor")
        result[concept_id] = Concept(
            entry["name"], entry["summary"], entry["target"], entry.get("english", ""), tuple(aliases)
        )
    return result


class ConceptCompiler:
    def __init__(self, registry_path: Path):
        self.registry_path = registry_path
        self.reset()

    def reset(self):
        self.concepts = load_registry(self.registry_path)
        self.files = None
        self.page = None
        self.used: dict[str, Concept] = {}
        self.prerequisites: list[str] = []
        self.anchor_uses: set[tuple[str, str, str, str]] = set()
        self.page_anchors: dict[str, set[str]] = {}

    def error(self, concept_id: str, detail: str):
        source = self.page.file.src_uri if self.page is not None else str(self.registry_path)
        raise PluginError(f"{source}: concept {concept_id!r}: {detail}")

    def resolve(self, concept_id: str):
        concept = self.concepts.get(concept_id)
        if concept is None:
            self.error(concept_id, "unknown concept ID")
        target = urlsplit(concept.target)
        file = self.files.get_file_from_path(unquote(target.path)) if self.files is not None else None
        if file is None or not file.is_documentation_page():
            self.error(concept_id, f"target file does not exist: {target.path}")
        if target.fragment:
            source = self.page.file.src_uri if self.page is not None else str(self.registry_path)
            self.anchor_uses.add((source, concept_id, file.src_uri, unquote(target.fragment)))
        return concept, file, target.fragment

    def set_files(self, files):
        self.files = files
        for concept_id in self.concepts:
            self.resolve(concept_id)

    def begin_page(self, page):
        self.page = page
        self.used = {}
        values = page.meta.get("prerequisites", [])
        if not isinstance(values, list) or any(not isinstance(v, str) for v in values):
            self.error("prerequisites", "must be a list of concept IDs")
        if len(set(values)) != len(values):
            self.error("prerequisites", "duplicate prerequisite ID")
        self.prerequisites = values
        for concept_id in values:
            self.resolve(concept_id)

    def url(self, concept_id: str) -> str:
        _, file, fragment = self.resolve(concept_id)
        url = get_relative_url(file.url, self.page.url)
        return url + ("#" + quote(unquote(fragment), safe="-._~") if fragment else "")

    def glossary_entry(self, concept_id: str) -> str:
        concept, _, _ = self.resolve(concept_id)
        label = html.escape(concept.name)
        if concept.english:
            label += f"（{html.escape(concept.english)}）"
        aliases = "亦称" + "、".join(html.escape(a) for a in concept.aliases) + "。" if concept.aliases else ""
        return (f'<ul><li><strong>{label}</strong>：{html.escape(concept.summary)}{aliases}'
                f'见 <a href="{html.escape(self.url(concept_id), quote=True)}">正文</a>。</li></ul>')

    def finish_content(self, content: str) -> str:
        if not self.prerequisites and not self.used:
            return content
        soup = BeautifulSoup(content, "html.parser")
        if self.prerequisites:
            nav = soup.new_tag("nav", attrs={"class": "plw-prerequisites", "aria-label": "本页需要"})
            strong = soup.new_tag("strong")
            strong.string = "本页需要"
            nav.append(strong)
            for index, concept_id in enumerate(self.prerequisites):
                nav.append("　" if index == 0 else " · ")
                link = soup.new_tag("a", href=self.url(concept_id))
                link.string = self.concepts[concept_id].name
                nav.append(link)
            heading = soup.find("h1", recursive=False)
            if heading is not None:
                heading.insert_after(nav)
            else:
                # Material inserts the page H1 before page.content.
                soup.insert(0, nav)
        if self.used:
            payload = {
                key: {"name": value.name, "english": value.english, "summary": value.summary, "href": self.url(key)}
                for key, value in self.used.items()
            }
            # This Material fork re-executes body scripts during instant
            # navigation without preserving inline script attributes. An
            # inert template preserves JSON and is never executed or indexed.
            data = soup.new_tag("template", attrs={"data-plw-concepts": "", "data-pagefind-ignore": "all"})
            data.string = json.dumps(payload, ensure_ascii=False).replace("&", "\\u0026").replace("<", "\\u003c").replace(">", "\\u003e")
            soup.append(data)
        return str(soup)

    def collect_anchors(self, output: str, page):
        soup = BeautifulSoup(output, "html.parser")
        self.page_anchors[page.file.src_uri] = {str(el["id"]) for el in soup.select("[id]")}

    def validate_anchors(self):
        errors = [f"{source}: concept {key!r}: missing target anchor {target}#{anchor}"
                  for source, key, target, anchor in sorted(self.anchor_uses)
                  if anchor not in self.page_anchors.get(target, set())]
        if errors:
            raise PluginError("\n".join(errors))


class ConceptTreeprocessor(Treeprocessor):
    def __init__(self, md, compiler: ConceptCompiler):
        super().__init__(md)
        self.compiler = compiler

    def run(self, root):
        compiler = self.compiler

        def visit(element, in_heading=False):
            if element.tag in {"pre", "code"} or "arithmatex" in element.get("class", "").split():
                return
            in_heading = in_heading or element.tag in {"h1", "h2", "h3", "h4", "h5", "h6"}
            attribute = "src" if element.tag == "img" else "href"
            target = element.get(attribute, "")
            if element.tag in {"a", "img"} and target.startswith("concept:"):
                concept_id = target[len("concept:"):]
                if in_heading or element.tag == "img":
                    compiler.error(concept_id, "concept references are not supported in headings or images")
                concept, file, fragment = compiler.resolve(concept_id)
                # MkDocs' relpath processor runs later (priority 0), validating
                # and converting this source-relative Markdown destination.
                path = posixpath.relpath(file.src_uri, posixpath.dirname(compiler.page.file.src_uri) or ".")
                element.set("href", quote(path, safe="/") + ("#" + fragment if fragment else ""))
                element.set("data-plw-concept", concept_id)
                compiler.used[concept_id] = concept
            for child in element:
                visit(child, in_heading)

        visit(root)
        # Only a standalone stashed HTML comment is a glossary directive.
        # Fenced/inline code and escaped examples never match this marker.
        for index, block in enumerate(self.md.htmlStash.rawHtmlBlocks):
            match = GLOSSARY_MARKER.fullmatch(block) if isinstance(block, str) else None
            if match:
                self.md.htmlStash.rawHtmlBlocks[index] = compiler.glossary_entry(match[1])
        return root


class ConceptExtension(Extension):
    def __init__(self, compiler):
        self.compiler = compiler
        super().__init__()

    def extendMarkdown(self, md):
        md.treeprocessors.register(ConceptTreeprocessor(md, self.compiler), "plw_concepts", 6)
