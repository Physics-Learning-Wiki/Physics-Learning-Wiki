from __future__ import annotations

import html
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlencode

from mkdocs.exceptions import ConfigurationError
from mkdocs.utils import get_relative_url

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.question_bank.compiler import compile_repository

_context: dict[str, object] = {}


def on_config(config, **kwargs):
    preview = os.getenv("PLW_QUIZ_PREVIEW") == "1"
    if preview and os.getenv("GITHUB_ACTIONS") == "true":
        raise ConfigurationError("PLW_QUIZ_PREVIEW is forbidden in GitHub Actions")
    root = Path(config.config_file_path).resolve().parent
    output = root / "docs" / "_generated" / "question-bank"
    report, metrics = compile_repository(root, output, preview=preview)
    if not report.ok:
        detail = "\n".join(issue.render() for issue in report.errors)
        raise ConfigurationError(f"question-bank validation failed:\n{detail}")
    manifest = json.loads((output / "manifest.json").read_text(encoding="utf-8"))
    _context.clear()
    _context.update({"preview": preview, "manifest": manifest})
    print(
        "[question-bank] "
        f"{len(report.data.questions)} source questions, {len(manifest['pages'])} pages, "
        f"{metrics['bytes']} bytes in {metrics['seconds']:.3f}s"
    )
    return config


def on_page_markdown(markdown, page, config, files, **kwargs):
    quiz = page.meta.get("quiz") if page.meta else None
    page_id = page.meta.get("page_id") if page.meta else None
    if not isinstance(quiz, dict) or not quiz.get("enabled") or not isinstance(page_id, str):
        return markdown
    marker = '<section class="plw-quiz-entry'
    if marker in markdown:
        return markdown
    manifest = _context.get("manifest", {})
    page_data = manifest.get("pages", {}).get(page_id) if isinstance(manifest, dict) else None
    if not isinstance(page_data, dict):
        return markdown
    objectives = page.meta.get("learning_objectives", [])
    objective_items = "".join(
        f"<li>{html.escape(str(item.get('title', '')))}</li>"
        for item in objectives
        if isinstance(item, dict)
    )
    assessments = "、".join(html.escape(str(item)) for item in quiz.get("common_assessments", []))
    count = int(page_data.get("publishedQuestionCount", 0))
    preview = bool(_context.get("preview"))
    usable = page_data.get("status") == "available" or (preview and int(page_data.get("previewQuestionCount", 0)) > 0)
    classes = "plw-quiz-entry" + (" plw-quiz-entry--building" if not usable else "")
    parts = [
        f'<section class="{classes}" data-page-id="{html.escape(page_id)}">',
        "<h2>本页掌握检查</h2>",
        "<p>学完本页，你应该能够：</p>",
        f"<ul>{objective_items}</ul>",
        f'<p class="plw-quiz-entry__styles">常见考法：{assessments}</p>',
    ]
    if usable:
        quiz_url = get_relative_url("quiz/", page.url)
        actions = []
        for mode, label in (("quick", "3 题快速检查"), ("full", "8 题完整小测")):
            query = urlencode({"page_id": page_id, "mode": mode})
            actions.append(f'<a class="md-button" data-no-instant href="{html.escape(quiz_url)}?{query}">{label}</a>')
        parts.append(f'<div class="plw-quiz-entry__actions">{" ".join(actions)}</div>')
        if preview:
            parts.append('<p class="plw-quiz-preview">草稿预览入口：题目未经人工审核。</p>')
        else:
            parts.append(f'<p class="plw-quiz-entry__status">本页题库共 {count} 道已审核题目。</p>')
    else:
        parts.append(f'<p class="plw-quiz-entry__status">目前有 {count}/24 道已审核题目，暂未开启随机小测。</p>')
    parts.append("</section>")
    return markdown.rstrip() + "\n\n" + "\n".join(parts) + "\n"
