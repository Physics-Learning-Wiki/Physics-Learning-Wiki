from __future__ import annotations

import math
import os
import shutil
import tempfile
import time
from pathlib import Path
from typing import Any

from .markdown_renderer import render_markdown
from .media import compiled_assets, question_content_fingerprint
from .models import PageRegistry, TaxonomyRegistry
from .selection import (
    matches_filters,
    solve_query_selection,
    solve_query_selection_detailed,
)
from .utils import canonical_json, fingerprint, tree_bytes
from .validator import ValidationReport, validate_repository


def _render_list(values: list[str]) -> list[str]:
    return [render_markdown(value) for value in values]


def _expand_topic_ancestors(topic_id: str, taxonomy: TaxonomyRegistry) -> set[str]:
    result = {topic_id}
    curr = topic_id
    while curr in taxonomy.topics:
        parent = taxonomy.topics[curr].parent
        if parent:
            result.add(parent)
            curr = parent
        else:
            break
    return result


def compile_question(
    source: dict[str, Any],
    asset_urls: dict[str, str],
    page_registry: PageRegistry | None = None,
    root: Path | None = None,
) -> dict[str, Any]:
    question: dict[str, Any] = {
        "id": source["id"],
        "version": source["version"],
        "status": source.get("status", "draft"),
        "type": source["type"],
        "choiceOrder": source.get("choice_order", "shuffle"),
        "topicIds": list(source.get("topics", [])),
        "conceptIds": list(source.get("concepts", [])),
        "objectiveIds": list(source.get("objectives", [])),
        "relatedPages": list(source.get("related_pages", [])),
        "stemHtml": render_markdown(source.get("stem", "")),
        "answer": source.get("answer", {}),
        "assets": asset_urls,
    }

    if "choices" in source:
        question["choices"] = [
            {"id": choice["id"], "contentHtml": render_markdown(choice.get("content", ""))}
            for choice in source["choices"]
        ]

    if "feedback" in source and isinstance(source["feedback"], dict):
        feedback: dict[str, Any] = {}
        for key, value in source["feedback"].items():
            if key == "choices" and isinstance(value, dict):
                feedback["choicesHtml"] = {cid: render_markdown(text) for cid, text in value.items()}
            elif isinstance(value, str):
                feedback[f"{key}Html"] = render_markdown(value)
        question["feedback"] = feedback

    if "hints" in source and isinstance(source["hints"], list):
        question["hintsHtml"] = [render_markdown(hint) for hint in source["hints"]]

    if "solution" in source and isinstance(source["solution"], str):
        question["solutionHtml"] = render_markdown(source["solution"])

    for field, target in [
        ("difficulty", "difficulty"),
        ("cognitive_level", "cognitiveLevel"),
        ("style", "style"),
        ("estimated_seconds", "estimatedSeconds"),
    ]:
        if field in source:
            question[target] = source[field]

    if root is not None:
        question["contentFingerprint"] = question_content_fingerprint(source, root)

    if page_registry is not None:
        objectives_detail = []
        for obj_id in source.get("objectives", []):
            page_id = page_registry.get_page_for_objective(obj_id)
            if page_id:
                page = page_registry.get_page(page_id)
                if page and obj_id in page.objectives:
                    obj_info = page.objectives[obj_id]
                    objectives_detail.append({
                        "id": obj_id,
                        "title": obj_info.get("title", obj_id),
                        "pageId": page_id,
                        "pageTitle": page.title,
                        "url": page.url,
                        "anchor": obj_info.get("anchor", ""),
                    })
        if objectives_detail:
            question["objectivesDetail"] = objectives_detail

        related_pages_detail = []
        for page_id in source.get("related_pages", []):
            page = page_registry.get_page(page_id)
            if page:
                related_pages_detail.append({
                    "id": page_id,
                    "title": page.title,
                    "url": page.url,
                })
        if related_pages_detail:
            question["relatedPagesDetail"] = related_pages_detail

    return question


def build_tree(report: ValidationReport, *, preview: bool) -> dict[str, bytes]:
    published_questions = [d for d in report.data.questions if d.data.get("status") == "published"]
    draft_questions = [d for d in report.data.questions if d.data.get("status") == "draft"]
    included_questions = published_questions + (draft_questions if preview else [])

    published_sets = [d for d in report.data.sets if d.data.get("status") == "published"]
    draft_sets = [d for d in report.data.sets if d.data.get("status") == "draft"]
    included_sets = published_sets + (draft_sets if preview else [])

    files: dict[str, bytes] = {}
    compiled_questions: dict[str, dict[str, Any]] = {}
    for doc in included_questions:
        asset_urls, asset_files = compiled_assets(doc.data, report.data.root)
        files.update(asset_files)
        cq = compile_question(
            doc.data,
            asset_urls,
            page_registry=report.data.page_registry,
            root=report.data.root,
        )
        compiled_questions[cq["id"]] = cq

    source_fingerprint = {
        "preview": preview,
        "questions": [
            {
                "data": doc.data,
                "contentFingerprint": question_content_fingerprint(doc.data, report.data.root),
            }
            for doc in sorted(included_questions, key=lambda d: str(d.data.get("id")))
        ],
        "sets": [
            doc.data
            for doc in sorted(included_sets, key=lambda d: str(d.data.get("id")))
        ],
        "topics": {
            tid: {"id": t.id, "title": t.title, "parent": t.parent}
            for tid, t in sorted(report.data.taxonomy.topics.items())
        },
        "concepts": {
            cid: {"id": c.id, "title": c.title, "topics": c.topics, "aliases": c.aliases}
            for cid, c in sorted(report.data.taxonomy.concepts.items())
        },
    }
    bank_fingerprint = fingerprint(source_fingerprint)

    # 1. Question Catalog
    questions_catalog_data = [
        compiled_questions[qid]
        for qid in sorted(compiled_questions.keys())
    ]
    digest = fingerprint(questions_catalog_data).split(":", 1)[1][:12]
    questions_catalog_path = f"catalog/questions.{digest}.json"
    files[questions_catalog_path] = canonical_json(questions_catalog_data)

    # 2. Taxonomy Catalog
    taxonomy_catalog_data = {
        "topics": {
            tid: {"id": t.id, "title": t.title, "parent": t.parent}
            for tid, t in sorted(report.data.taxonomy.topics.items())
        },
        "concepts": {
            cid: {"id": c.id, "title": c.title, "topics": c.topics, "aliases": c.aliases}
            for cid, c in sorted(report.data.taxonomy.concepts.items())
        },
    }
    digest = fingerprint(taxonomy_catalog_data).split(":", 1)[1][:12]
    taxonomy_catalog_path = f"catalog/taxonomy.{digest}.json"
    files[taxonomy_catalog_path] = canonical_json(taxonomy_catalog_data)

    # 3. Sets and Set Bundles
    manifest_sets: dict[str, Any] = {}
    sets_catalog_data: list[dict[str, Any]] = []

    for set_doc in sorted(included_sets, key=lambda d: str(d.data.get("id"))):
        set_data = set_doc.data
        set_id = str(set_data["id"])
        sel = set_data.get("selection", {})
        sel_type = sel.get("type")

        set_status = set_data.get("status", "draft")
        is_set_published = set_status == "published"
        set_question_pool = [doc.data for doc in (published_questions if is_set_published else included_questions)]

        if sel_type == "fixed":
            q_ids = sel.get("questions", [])
            valid_pool_ids = {q["id"] for q in set_question_pool}
            candidate_qs = [compiled_questions[qid] for qid in q_ids if qid in compiled_questions and qid in valid_pool_ids]
            question_count = len(q_ids)
            if len(candidate_qs) == len(q_ids):
                runnable = True
                unavailable_reason = None
            else:
                runnable = False
                missing = set(q_ids) - valid_pool_ids
                unavailable_reason = f"Missing referenced questions: {', '.join(sorted(missing))}"
        else:  # query
            question_count = sel.get("count", 0)
            top_filters = sel.get("filters", {})
            candidate_raw = [
                q for q in set_question_pool
                if matches_filters(q, top_filters, report.data.taxonomy)
            ]
            candidate_qs = [
                compiled_questions[q["id"]]
                for q in sorted(candidate_raw, key=lambda item: item["id"])
                if q["id"] in compiled_questions
            ]
            solution_res = solve_query_selection_detailed(candidate_raw, sel, report.data.taxonomy, set_id=set_id)
            if solution_res.is_ok:
                runnable = True
                unavailable_reason = None
            else:
                runnable = False
                unavailable_reason = solution_res.message or "No candidate questions satisfy selection slots and constraints"

        # Derive topicIds
        set_topics: set[str] = set()
        for cq in candidate_qs:
            for tid in cq.get("topicIds", []):
                set_topics.update(_expand_topic_ancestors(tid, report.data.taxonomy))
        sorted_topic_ids = sorted(set_topics)

        # Fixed sets have a known total; query sets vary, so use the candidate
        # pool's average as a rough time estimate only when every item is timed.
        durations = [q.get("estimatedSeconds") for q in candidate_qs]
        estimated_minutes = None
        if durations and all(isinstance(seconds, int) and seconds > 0 for seconds in durations):
            total_seconds = sum(durations)
            if sel_type == "query":
                total_seconds = total_seconds * question_count / len(durations)
            estimated_minutes = max(1, math.ceil(total_seconds / 60))

        # Set Bundle
        bundle = {
            "schemaVersion": 3,
            "bankFingerprint": bank_fingerprint,
            "selectionAlgorithmVersion": 1,
            "preview": preview,
            "set": set_data,
            "runnable": runnable,
            "unavailableReason": unavailable_reason,
            "questions": candidate_qs,
        }
        digest = fingerprint(bundle).split(":", 1)[1][:12]
        bundle_path = f"sets/{set_id}.{digest}.json"
        files[bundle_path] = canonical_json(bundle)

        manifest_sets[set_id] = {
            "title": set_data["title"],
            "status": set_data["status"],
            "bundle": bundle_path,
        }

        sets_catalog_data.append({
            "id": set_id,
            "title": set_data["title"],
            "description": set_data.get("description", ""),
            "tags": set_data.get("tags", []),
            "status": set_data["status"],
            "selectionType": sel_type,
            "questionCount": question_count,
            "estimatedMinutes": estimated_minutes,
            "feedbackMode": set_data.get("feedback_mode", "immediate"),
            "topicIds": sorted_topic_ids,
            "runnable": runnable,
            "unavailableReason": unavailable_reason,
        })

    digest = fingerprint(sets_catalog_data).split(":", 1)[1][:12]
    sets_catalog_path = f"catalog/sets.{digest}.json"
    files[sets_catalog_path] = canonical_json(sets_catalog_data)

    # 4. Manifest v3
    manifest = {
        "schemaVersion": 3,
        "bankFingerprint": bank_fingerprint,
        "selectionAlgorithmVersion": 1,
        "preview": preview,
        "catalogs": {
            "questions": questions_catalog_path,
            "sets": sets_catalog_path,
            "taxonomy": taxonomy_catalog_path,
        },
        "sets": manifest_sets,
    }
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


def compile_repository(
    root: Path | str = ".",
    output: Path | str | None = None,
    *,
    preview: bool = False,
) -> tuple[ValidationReport, dict[str, int | float | bool]]:
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
