from __future__ import annotations

import html
import json
import os
import re
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
    sets_catalog_path = output / manifest["catalogs"]["sets"]
    sets_catalog = json.loads(sets_catalog_path.read_text(encoding="utf-8"))
    _context.clear()
    _context.update({
        "preview": preview,
        "manifest": manifest,
        "sets_catalog": {s["id"]: s for s in sets_catalog},
    })
    print(
        "[question-bank] "
        f"{len(report.data.questions)} source questions, {len(manifest.get('sets', {}))} sets, "
        f"{metrics['bytes']} bytes in {metrics['seconds']:.3f}s"
    )
    return config


def on_page_markdown(markdown, page, config, files, **kwargs):
    assessments = page.meta.get("assessments") if page.meta else None
    if not isinstance(assessments, list) or not assessments:
        return markdown

    page_id = page.meta.get("page_id") if page.meta else None
    manifest = _context.get("manifest", {})
    sets_catalog = _context.get("sets_catalog", {})
    preview = bool(_context.get("preview"))

    # 1. Inline placements
    for item in assessments:
        if not isinstance(item, dict) or item.get("placement") != "inline":
            continue
        set_id = item.get("set")
        if not isinstance(set_id, str):
            continue
        set_info = sets_catalog.get(set_id) if isinstance(sets_catalog, dict) else None
        if not set_info:
            continue
        status = set_info.get("status")
        if status == "retired":
            continue
        if status == "draft" and not preview:
            continue
        anchor = item.get("anchor")
        if not isinstance(anchor, str) or not anchor:
            continue
        title = item.get("title") or set_info.get("title", set_id)
        runnable = set_info.get("runnable", True)
        manifest_url = get_relative_url("_generated/question-bank/manifest.json", page.url)

        if preview and not runnable:
            inline_html = (
                f'<div class="plw-quiz-inline-diagnostic" data-set-id="{html.escape(set_id)}">\n'
                f'  <div class="plw-quiz-preview" role="note">草稿测试不可行</div>\n'
                f'  <p><strong>{html.escape(title)}</strong>: {html.escape(str(set_info.get("unavailableReason", "无法满足选题约束")))}</p>\n'
                f'</div>'
            )
        else:
            inline_html = (
                f'<div class="plw-quiz-inline-root" '
                f'data-set-id="{html.escape(set_id)}" '
                f'data-manifest-url="{html.escape(manifest_url)}" '
                f'data-page-id="{html.escape(str(page_id or ""))}" '
                f'data-title="{html.escape(title)}">\n'
                f'  <noscript>此功能需要 JavaScript．请启用 JavaScript 后重新打开页面．</noscript>\n'
                f'</div>'
            )

        pattern = re.compile(rf'''(<[^>]+id=["']{re.escape(anchor)}["'][^>]*>(?:</[^>]+>)?|\{{#?{re.escape(anchor)}\}})''')
        match = pattern.search(markdown)
        if match:
            pos = match.end()
            markdown = markdown[:pos] + "\n\n" + inline_html + "\n\n" + markdown[pos:]

    # 2. Footer placements
    footer_cards: list[str] = []
    for item in assessments:
        if not isinstance(item, dict) or item.get("placement") != "footer":
            continue
        set_id = item.get("set")
        if not isinstance(set_id, str):
            continue
        set_info = sets_catalog.get(set_id) if isinstance(sets_catalog, dict) else None
        if not set_info:
            continue
        status = set_info.get("status")
        if status == "retired":
            continue
        if status == "draft" and not preview:
            continue
        title = item.get("title") or set_info.get("title", set_id)
        desc = set_info.get("description", "")
        count = set_info.get("questionCount", 0)
        feedback_mode = set_info.get("feedbackMode", "immediate")
        mode_badge = "即时反馈" if feedback_mode == "immediate" else "整卷提交"
        runnable = set_info.get("runnable", True)
        quiz_play_url = get_relative_url("quiz/play/", page.url)
        play_link = f"{quiz_play_url}?set={html.escape(set_id)}"

        card_lines = ['<div class="plw-quiz-footer-card">']
        if preview and status == "draft":
            card_lines.append('<p class="plw-quiz-preview">草稿预览入口：题目未经人工审核。</p>')
        card_lines.append(f'<h3>{html.escape(title)}</h3>')
        if desc:
            card_lines.append(f'<p class="plw-quiz-footer-card__desc">{html.escape(desc)}</p>')
        card_lines.append(f'<p class="plw-quiz-footer-card__meta">共 {count} 道题目 · {mode_badge}</p>')

        if runnable:
            card_lines.append(
                f'<div class="plw-quiz-entry__actions">'
                f'<a class="md-button" data-no-instant href="{play_link}">开始小测</a>'
                f'</div>'
            )
        else:
            card_lines.append(
                f'<div class="plw-quiz-entry__actions">'
                f'<button type="button" class="md-button md-button--disabled" disabled>测试不可用</button>'
                f'</div>'
            )
            if preview:
                card_lines.append(
                    f'<p class="plw-quiz-footer-card__reason">{html.escape(str(set_info.get("unavailableReason", "")))}</p>'
                )
        card_lines.append('</div>')
        footer_cards.append("\n".join(card_lines))

    if footer_cards:
        footer_section = [
            f'<section class="plw-quiz-entry plw-quiz-footer-cards" data-page-id="{html.escape(str(page_id or ""))}">',
            '<h2>本页小测与复习</h2>',
            '<div class="plw-quiz-footer-cards__grid">',
            *footer_cards,
            '</div>',
            '</section>',
        ]
        markdown = markdown.rstrip() + "\n\n" + "\n".join(footer_section) + "\n"

    return markdown
