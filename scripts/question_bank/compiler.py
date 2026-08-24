from __future__ import annotations

import os
import shutil
import tempfile
import time
from pathlib import Path
from typing import Any

from .markdown_renderer import render_markdown
from .media import compiled_assets, question_content_fingerprint
from .utils import canonical_json, fingerprint, tree_bytes
from .validator import ValidationReport, publication_readiness, validate_repository


def _render_list(values: list[str]) -> list[str]:
    return [render_markdown(value) for value in values]


def compile_question(source: dict[str, Any], asset_urls: dict[str, str]) -> dict[str, Any]:
    question: dict[str, Any] = {
        "id": source["id"],
        "version": source["version"],
        "type": source["type"],
        "choiceOrder": source["choice_order"],
        "primaryObjective": source["primary_objective"],
        "secondaryObjectives": source.get("secondary_objectives", []),
        "conceptIds": source["concepts"],
        "stemHtml": render_markdown(source["stem"]),
        "answer": source["answer"],
        "feedback": {
            key + "Html" if key != "choices" else "choicesHtml": (
                {choice: render_markdown(text) for choice, text in value.items()}
                if isinstance(value, dict) else render_markdown(value)
            )
            for key, value in source["feedback"].items()
        },
        "hintsHtml": _render_list(source.get("hints", [])),
        "solutionHtml": render_markdown(source["solution"]),
        "difficulty": source["difficulty"],
        "cognitiveLevel": source["cognitive_level"],
        "style": source["style"],
        "estimatedSeconds": source["estimated_seconds"],
        "assets": asset_urls,
    }
    if "choices" in source:
        question["choices"] = [{"id": choice["id"], "contentHtml": render_markdown(choice["content"])} for choice in source["choices"]]
    return question


def _blueprint_for(report: ValidationReport, blueprint_id: str) -> dict[str, Any]:
    for blueprint in report.data.blueprints:
        if blueprint.data.get("id") == blueprint_id:
            return blueprint.data
    return {}


def build_tree(report: ValidationReport, *, preview: bool) -> dict[str, bytes]:
    included = [
        document for document in report.data.questions
        if document.data.get("status") == "published" or (preview and document.data.get("status") == "draft")
    ]
    source_fingerprint = {
        "preview": preview,
        "pages": {page_id: page.objectives for page_id, page in report.data.pages.items()},
        "blueprints": [document.data for document in report.data.blueprints],
        "questions": [
            {
                "data": document.data,
                "contentFingerprint": question_content_fingerprint(document.data, report.data.root),
            }
            for document in included
        ],
    }
    bank_fingerprint = fingerprint(source_fingerprint)
    files: dict[str, bytes] = {}
    manifest_pages: dict[str, Any] = {}
    for page_id, page in sorted(report.data.pages.items()):
        if not page.quiz.get("enabled"):
            continue
        page_questions = [document for document in included if page_id in document.data.get("scope", {}).get("pages", [])]
        published_count = sum(
            1 for document in report.data.questions
            if document.data.get("status") == "published" and page_id in document.data.get("scope", {}).get("pages", [])
        )
        blueprint = _blueprint_for(report, str(page.quiz.get("blueprint", "")))
        published_sources = [
            document.data for document in report.data.questions
            if document.data.get("status") == "published" and page_id in document.data.get("scope", {}).get("pages", [])
        ]
        available, _ = publication_readiness(page, published_sources, blueprint)
        compiled_questions = []
        for document in sorted(page_questions, key=lambda item: item.data["id"]):
            asset_urls, asset_files = compiled_assets(document.data, report.data.root)
            files.update(asset_files)
            compiled_questions.append(compile_question(document.data, asset_urls))
        bundle = {
            "schemaVersion": 2,
            "bankFingerprint": bank_fingerprint,
            "preview": preview,
            "page": {
                "id": page_id,
                "title": page.title,
                "url": page.url,
                "objectives": list(page.objectives.values()),
            },
            "blueprint": blueprint,
            "questions": compiled_questions,
        }
        digest = fingerprint(bundle).split(":", 1)[1][:12]
        bundle_path = f"pages/{page_id}.{digest}.json"
        files[bundle_path] = canonical_json(bundle)
        modes = {
            name: {"title": mode.get("title", name), "total": mode.get("total", 0)}
            for name, mode in blueprint.get("modes", {}).items()
        }
        active = page.quiz.get("state") == "active"
        manifest_pages[page_id] = {
            "title": page.title,
            "url": page.url,
            "bundle": bundle_path,
            "status": "available" if active and available else "construction",
            "publishedQuestionCount": published_count,
            "previewQuestionCount": len(page_questions) if preview else 0,
            "modes": modes,
            "objectives": list(page.objectives.values()),
            "questionPrefix": page.quiz.get("question_prefix", ""),
        }
    manifest = {"schemaVersion": 2, "bankFingerprint": bank_fingerprint, "preview": preview, "pages": manifest_pages}
    files["manifest.json"] = canonical_json(manifest)
    return files


def write_atomic(output: Path, files: dict[str, bytes]) -> bool:
    expected = files
    if tree_bytes(output) == expected:
        return False
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = Path(tempfile.mkdtemp(prefix=f".{output.name}-", dir=output.parent))
    backup = output.with_name(f".{output.name}.backup")
    try:
        for relative, content in expected.items():
            target = temporary / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
        if backup.exists():
            shutil.rmtree(backup)
        if output.exists():
            os.replace(output, backup)
        os.replace(temporary, output)
        if backup.exists():
            shutil.rmtree(backup)
    except Exception:
        if output.exists() and backup.exists():
            shutil.rmtree(output)
            os.replace(backup, output)
        raise
    finally:
        if temporary.exists():
            shutil.rmtree(temporary)
    return True


def compile_repository(root: Path | str = ".", output: Path | str | None = None, *, preview: bool = False) -> tuple[ValidationReport, dict[str, int | float | bool]]:
    started = time.perf_counter()
    report = validate_repository(root, include_drafts=preview)
    if not report.ok:
        return report, {"written": False, "seconds": time.perf_counter() - started, "bytes": 0, "files": 0}
    output_path = Path(output) if output else report.data.root / "docs" / "_generated" / "question-bank"
    files = build_tree(report, preview=preview)
    written = write_atomic(output_path, files)
    return report, {
        "written": written,
        "seconds": time.perf_counter() - started,
        "bytes": sum(len(content) for content in files.values()),
        "files": len(files),
    }
