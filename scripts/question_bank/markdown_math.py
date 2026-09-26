from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from .loader import SourceDocument
from .markdown_renderer import (
    CONTAINER_PREFIX_RE,
    FENCE_OPEN_RE,
    mask_markdown_code,
    render_markdown,
)

TAG_RE = re.compile(r"<[^>]+>")


@dataclass(frozen=True)
class MarkdownFieldRef:
    path: str
    text: str


def iter_question_markdown_fields(data: dict[str, Any]) -> list[MarkdownFieldRef]:
    """Iterate over all logical Markdown text fields in a question object."""
    fields: list[MarkdownFieldRef] = []

    stem = data.get("stem")
    if isinstance(stem, str):
        fields.append(MarkdownFieldRef("stem", stem))

    for index, choice in enumerate(data.get("choices") or []):
        if isinstance(choice, dict):
            content = choice.get("content")
            if isinstance(content, str):
                fields.append(MarkdownFieldRef(f"choices[{index}].content", content))

    for index, hint in enumerate(data.get("hints") or []):
        if isinstance(hint, str):
            fields.append(MarkdownFieldRef(f"hints[{index}]", hint))

    solution = data.get("solution")
    if isinstance(solution, str):
        fields.append(MarkdownFieldRef("solution", solution))

    ref_answer = data.get("reference_answer")
    if isinstance(ref_answer, str):
        fields.append(MarkdownFieldRef("reference_answer", ref_answer))

    feedback = data.get("feedback")
    if isinstance(feedback, dict):
        for key, value in feedback.items():
            if key == "choices" and isinstance(value, dict):
                for cid, ctext in value.items():
                    if isinstance(ctext, str):
                        fields.append(MarkdownFieldRef(f"feedback.choices.{cid}", ctext))
            elif isinstance(value, str):
                fields.append(MarkdownFieldRef(f"feedback.{key}", value))

    return fields



@dataclass
class MathDiagnostic:
    question_id: str
    status: str
    field: str
    kind: str
    source_change_required: bool
    line: int | None = None
    snippet: str | None = None
    detail: str | None = None

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "question_id": self.question_id,
            "status": self.status,
            "field": self.field,
            "kind": self.kind,
            "source_change_required": self.source_change_required,
        }
        if self.line is not None:
            d["line"] = self.line
        if self.snippet is not None:
            d["snippet"] = self.snippet
        if self.detail is not None:
            d["detail"] = self.detail
        return d


@dataclass
class MathAuditSummary:
    total_questions: int
    published_questions: int
    questions_with_display_math: int
    compact_standalone_count: int
    source_change_required_count: int
    source_change_required_questions: list[str]
    diagnostics_by_kind: dict[str, int]
    render_stats: dict[str, int]
    total_diagnostics: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def audit_markdown_field(
    text: str,
    question_id: str = "",
    status: str = "draft",
    field_path: str = "",
    strict_style: bool = False,
) -> tuple[list[MathDiagnostic], dict[str, int]]:
    diagnostics: list[MathDiagnostic] = []
    render_stats = {
        "inline_arithmatex": 0,
        "display_arithmatex": 0,
        "compact_standalone": 0,
    }

    # 1. Identify code-exempt $$ occurrences
    masked_text = mask_markdown_code(text)
    orig_pos = 0
    while True:
        pos = text.find("$$", orig_pos)
        if pos == -1:
            break
        if masked_text[pos : pos + 2] != "$$":
            line_num = text[:pos].count("\n") + 1
            line_content = text.splitlines()[line_num - 1].strip() if text.splitlines() else None
            diagnostics.append(
                MathDiagnostic(
                    question_id=question_id,
                    status=status,
                    field=field_path,
                    kind="code-exempt",
                    source_change_required=False,
                    line=line_num,
                    snippet=line_content,
                    detail="$$ inside code block or code span is exempt",
                )
            )
        orig_pos = pos + 2

    # 2. Analyze display $$ tokens in unmasked text
    lines = text.splitlines()
    masked_lines = masked_text.splitlines()

    token_positions: list[tuple[int, int]] = []
    for l_idx, m_line in enumerate(masked_lines):
        c_idx = 0
        while True:
            found = m_line.find("$$", c_idx)
            if found == -1:
                break
            token_positions.append((l_idx, found))
            c_idx = found + 2

    i = 0
    while i < len(token_positions):
        open_line_idx, open_col = token_positions[i]
        open_raw_line = lines[open_line_idx]
        open_line_num = open_line_idx + 1

        if i + 1 >= len(token_positions):
            diagnostics.append(
                MathDiagnostic(
                    question_id=question_id,
                    status=status,
                    field=field_path,
                    kind="unclosed-display",
                    source_change_required=True,
                    line=open_line_num,
                    snippet=open_raw_line.strip(),
                    detail="Unclosed display math delimiter $$",
                )
            )
            i += 1
            break

        close_line_idx, close_col = token_positions[i + 1]
        close_raw_line = lines[close_line_idx]

        if open_line_idx == close_line_idx:
            m_line = masked_lines[open_line_idx]
            prefix_match = CONTAINER_PREFIX_RE.match(m_line)
            prefix_len = len(prefix_match.group(0)) if prefix_match else 0

            before_open = m_line[prefix_len:open_col].strip()
            after_close = m_line[close_col + 2 :].strip()
            formula_content = open_raw_line[open_col + 2 : close_col].strip()

            if before_open or after_close:
                diagnostics.append(
                    MathDiagnostic(
                        question_id=question_id,
                        status=status,
                        field=field_path,
                        kind="embedded-display-delimiter",
                        source_change_required=True,
                        line=open_line_num,
                        snippet=open_raw_line.strip(),
                        detail="Display math delimiter $$ embedded in prose on the same line",
                    )
                )
            elif not formula_content:
                diagnostics.append(
                    MathDiagnostic(
                        question_id=question_id,
                        status=status,
                        field=field_path,
                        kind="embedded-display-delimiter",
                        source_change_required=True,
                        line=open_line_num,
                        snippet=open_raw_line.strip(),
                        detail="Empty display math delimiter",
                    )
                )
            else:
                render_stats["compact_standalone"] += 1
                if strict_style:
                    diagnostics.append(
                        MathDiagnostic(
                            question_id=question_id,
                            status=status,
                            field=field_path,
                            kind="compact-standalone-display",
                            source_change_required=False,
                            line=open_line_num,
                            snippet=open_raw_line.strip(),
                            detail="Compact single-line $$...$$; compatible but multi-line block is preferred",
                        )
                    )
        else:
            m_open_line = masked_lines[open_line_idx]
            open_prefix_match = CONTAINER_PREFIX_RE.match(m_open_line)
            open_prefix_len = len(open_prefix_match.group(0)) if open_prefix_match else 0
            before_open = m_open_line[open_prefix_len:open_col].strip()
            after_open = m_open_line[open_col + 2 :].strip()

            m_close_line = masked_lines[close_line_idx]
            close_prefix_match = CONTAINER_PREFIX_RE.match(m_close_line)
            close_prefix_len = len(close_prefix_match.group(0)) if close_prefix_match else 0
            before_close = m_close_line[close_prefix_len:close_col].strip()
            after_close = m_close_line[close_col + 2 :].strip()

            if before_open or after_open or before_close or after_close:
                diagnostics.append(
                    MathDiagnostic(
                        question_id=question_id,
                        status=status,
                        field=field_path,
                        kind="split-boundary-display",
                        source_change_required=True,
                        line=open_line_num,
                        snippet=open_raw_line.strip(),
                        detail=f"Opening or closing $$ shares line with formula/prose (lines {open_line_num}-{close_line_idx + 1})",
                    )
                )

        i += 2

    # 3. Check render_markdown product
    try:
        html = render_markdown(text)
    except Exception as exc:
        diagnostics.append(
            MathDiagnostic(
                question_id=question_id,
                status=status,
                field=field_path,
                kind="raw-dollar-after-render",
                source_change_required=True,
                detail=f"render_markdown failed: {exc}",
            )
        )
        return diagnostics, render_stats

    render_stats["inline_arithmatex"] = html.count('<span class="arithmatex">')
    render_stats["display_arithmatex"] = html.count('<div class="arithmatex">')

    has_source_issue = any(d.source_change_required for d in diagnostics)
    if has_source_issue and "$$" in text:
        html_without_code = re.sub(r"<code>.*?</code>", "", html, flags=re.DOTALL)
        text_content = TAG_RE.sub(" ", html_without_code)
        if "$$" in text_content:
            diagnostics.append(
                MathDiagnostic(
                    question_id=question_id,
                    status=status,
                    field=field_path,
                    kind="raw-dollar-after-render",
                    source_change_required=True,
                    detail="Raw $$ delimiter remained in rendered HTML output",
                )
            )
        elif re.search(r"\$(?:\s*<span class=\"arithmatex\">|\w)", html_without_code):
            diagnostics.append(
                MathDiagnostic(
                    question_id=question_id,
                    status=status,
                    field=field_path,
                    kind="raw-dollar-after-render",
                    source_change_required=True,
                    detail="Raw unrendered $ delimiter remained around arithmatex in HTML",
                )
            )

        if '<span class="arithmatex">' in html and any(d.kind == "embedded-display-delimiter" for d in diagnostics):
            diagnostics.append(
                MathDiagnostic(
                    question_id=question_id,
                    status=status,
                    field=field_path,
                    kind="display-rendered-as-inline",
                    source_change_required=True,
                    detail="Display math $$ was rendered as inline arithmatex span due to embedded prose",
                )
            )

    return diagnostics, render_stats


def audit_question(
    data: dict[str, Any],
    question_id: str = "",
    strict_style: bool = False,
) -> tuple[list[MathDiagnostic], dict[str, int]]:
    status = data.get("status", "draft")
    qid = data.get("id", question_id)
    diagnostics: list[MathDiagnostic] = []
    totals = {"inline_arithmatex": 0, "display_arithmatex": 0, "compact_standalone": 0}

    for field_ref in iter_question_markdown_fields(data):
        field_diagnostics, stats = audit_markdown_field(
            field_ref.text,
            question_id=qid,
            status=status,
            field_path=field_ref.path,
            strict_style=strict_style,
        )
        diagnostics.extend(field_diagnostics)
        for k, v in stats.items():
            totals[k] += v

    return diagnostics, totals


def audit_repository(
    questions: list[SourceDocument],
    strict_style: bool = False,
) -> tuple[MathAuditSummary, list[MathDiagnostic]]:
    all_diagnostics: list[MathDiagnostic] = []
    published_count = 0
    questions_with_display_math = 0
    questions_requiring_change = set()
    total_render_stats = {"inline_arithmatex": 0, "display_arithmatex": 0, "compact_standalone": 0}

    for doc in questions:
        data = doc.data
        qid = data.get("id", doc.path.name)
        status = data.get("status", "draft")
        if status == "published":
            published_count += 1

        fields = iter_question_markdown_fields(data)
        has_display = any("$$" in f.text for f in fields)
        if has_display:
            questions_with_display_math += 1

        doc_diagnostics, doc_stats = audit_question(data, question_id=qid, strict_style=strict_style)
        all_diagnostics.extend(doc_diagnostics)
        for k, v in doc_stats.items():
            total_render_stats[k] += v

        if any(d.source_change_required for d in doc_diagnostics):
            questions_requiring_change.add(qid)

    diagnostics_by_kind: dict[str, int] = {}
    for d in all_diagnostics:
        diagnostics_by_kind[d.kind] = diagnostics_by_kind.get(d.kind, 0) + 1

    summary = MathAuditSummary(
        total_questions=len(questions),
        published_questions=published_count,
        questions_with_display_math=questions_with_display_math,
        compact_standalone_count=total_render_stats["compact_standalone"],
        source_change_required_count=len(questions_requiring_change),
        source_change_required_questions=sorted(questions_requiring_change),
        diagnostics_by_kind=diagnostics_by_kind,
        render_stats=total_render_stats,
        total_diagnostics=len(all_diagnostics),
    )

    return summary, all_diagnostics


def format_audit_report(summary: MathAuditSummary, diagnostics: list[MathDiagnostic]) -> str:
    lines: list[str] = [
        "=== Question Bank Markdown Math Audit ===",
        f"Total questions: {summary.total_questions}",
        f"Published questions: {summary.published_questions}",
        f"Questions with display math ($$): {summary.questions_with_display_math}",
        f"Compact standalone display expressions: {summary.compact_standalone_count}",
        f"Questions requiring source change: {summary.source_change_required_count}",
        f"Total diagnostics: {summary.total_diagnostics}",
        "",
        "Render stats:",
        f"  - inline arithmatex spans: {summary.render_stats.get('inline_arithmatex', 0)}",
        f"  - display arithmatex divs: {summary.render_stats.get('display_arithmatex', 0)}",
        "",
        "Diagnostics by kind:",
    ]
    for kind, count in sorted(summary.diagnostics_by_kind.items()):
        lines.append(f"  - {kind}: {count}")

    source_changes = [d for d in diagnostics if d.source_change_required]
    if source_changes:
        lines.append("")
        lines.append(f"Source changes required ({len(summary.source_change_required_questions)} questions):")
        seen = set()
        for d in source_changes:
            key = (d.question_id, d.field, d.kind)
            if key in seen:
                continue
            seen.add(key)
            loc = f" line {d.line}" if d.line else ""
            lines.append(f"  [{d.question_id}] ({d.status}) {d.field}{loc}: {d.kind} - {d.detail or ''}")
            if d.snippet:
                lines.append(f"    snippet: {d.snippet[:80]}")

    return "\n".join(lines) + "\n"
