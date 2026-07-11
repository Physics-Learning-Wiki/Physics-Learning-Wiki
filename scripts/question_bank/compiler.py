from __future__ import annotations

import os
import shutil
import tempfile
import time
from pathlib import Path
from typing import Any

from .markdown_renderer import render_markdown
from .utils import canonical_json, fingerprint, tree_bytes
from .validator import ValidationReport, validate_repository


def _render_list(values: list[str]) -> list[str]:
    return [render_markdown(value) for value in values]


def compile_question(source: dict[str, Any]) -> dict[str, Any]:
    question: dict[str, Any] = {
        "id": source["id"],
        "version": source["version"],
        "type": source["type"],
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
        "questions": [document.data for document in included],
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
        counts = {objective: 0 for objective in page.objectives}
        for document in page_questions:
            counts[document.data.get("primary_objective")] = counts.get(document.data.get("primary_objective"), 0) + 1
        available = published_count >= 24 and all(count >= 4 for count in counts.values())
        blueprint = _blueprint_for(report, str(page.quiz.get("blueprint", "")))
        bundle = {
            "schemaVersion": 1,
            "bankFingerprint": bank_fingerprint,
            "preview": preview,
            "page": {
                "id": page_id,
                "title": page.title,
                "url": page.url,
                "objectives": list(page.objectives.values()),
            },
            "blueprint": blueprint,
            "questions": [compile_question(document.data) for document in sorted(page_questions, key=lambda item: item.data["id"])],
        }
        digest = fingerprint(bundle).split(":", 1)[1][:12]
        bundle_path = f"pages/{page_id}.{digest}.json"
        files[bundle_path] = canonical_json(bundle)
        modes = {name: mode.get("total", 0) for name, mode in blueprint.get("modes", {}).items()}
        manifest_pages[page_id] = {
            "title": page.title,
            "url": page.url,
            "bundle": bundle_path,
            "status": "available" if available else "construction",
            "publishedQuestionCount": published_count,
            "previewQuestionCount": len(page_questions) if preview else 0,
            "modes": modes,
        }
    manifest = {"schemaVersion": 1, "bankFingerprint": bank_fingerprint, "preview": preview, "pages": manifest_pages}
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
    report = validate_repository(root)
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
