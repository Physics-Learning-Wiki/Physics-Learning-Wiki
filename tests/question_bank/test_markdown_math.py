from __future__ import annotations

from pathlib import Path

from scripts.question_bank.loader import load_tree
from scripts.question_bank.markdown_math import (
    audit_markdown_field,
    audit_repository,
    iter_question_markdown_fields,
    mask_markdown_code,
)

REPO_ROOT = Path(__file__).parents[2]


def test_code_masking_covers_inline_and_fenced_blocks() -> None:
    # 1. Inline code span
    s1 = "Here is code: `$$` and not math."
    masked1 = mask_markdown_code(s1)
    assert "$$" not in masked1
    assert len(masked1) == len(s1)

    # 2. 4-backtick fence containing 3-backticks and $$
    s2 = "````text\n$$\n```\n````"
    masked2 = mask_markdown_code(s2)
    assert "$$" not in masked2
    assert len(masked2) == len(s2)

    # 3. Tilde fence
    s3 = "~~~text\n$$E=mc^2$$\n~~~"
    masked3 = mask_markdown_code(s3)
    assert "$$" not in masked3
    assert len(masked3) == len(s3)


def test_code_exempt_diagnostics_reported() -> None:
    text = "Formula in code: `$$` should be code-exempt."
    diagnostics, _ = audit_markdown_field(text, question_id="test-1", field_path="stem")
    exempt = [d for d in diagnostics if d.kind == "code-exempt"]
    assert len(exempt) == 1
    assert exempt[0].source_change_required is False


def test_compact_standalone_display_is_safe_and_not_source_change() -> None:
    samples = [
        "$$E = mc^2$$",
        "   $$a + b = c$$",
        "> $$F = ma$$",
        "1. $$x = y$$",
        "- $$\\alpha = \\beta$$",
    ]
    for sample in samples:
        diagnostics, stats = audit_markdown_field(sample, question_id="test-compact", field_path="solution")
        assert not any(d.source_change_required for d in diagnostics), f"Failed for {sample}"
        assert stats["compact_standalone"] == 1


def test_embedded_display_delimiter_requires_source_change() -> None:
    text = "根据高斯定理： $$E = \\frac{q}{4\\pi\\varepsilon_0 r^2}$$ 代入可得结果。"
    diagnostics, _ = audit_markdown_field(text, question_id="test-embedded", field_path="solution")
    embedded = [d for d in diagnostics if d.kind == "embedded-display-delimiter"]
    assert len(embedded) >= 1
    assert embedded[0].source_change_required is True


def test_split_boundary_display_requires_source_change() -> None:
    text = "$$\\begin{cases}\nx = 1 \\\\\ny = 2\n\\end{cases}$$"
    diagnostics, _ = audit_markdown_field(text, question_id="test-split", field_path="solution")
    split = [d for d in diagnostics if d.kind == "split-boundary-display"]
    assert len(split) >= 1
    assert split[0].source_change_required is True


def test_unclosed_display_delimiter_requires_source_change() -> None:
    text = "未闭合公式：\n$$E = mc^2\n下一行正文"
    diagnostics, _ = audit_markdown_field(text, question_id="test-unclosed", field_path="solution")
    unclosed = [d for d in diagnostics if d.kind == "unclosed-display"]
    assert len(unclosed) == 1
    assert unclosed[0].source_change_required is True


def test_iter_question_markdown_fields_covers_all_content_locations() -> None:
    question_data = {
        "stem": "题干内容",
        "choices": [{"id": "A", "content": "选项 A"}, {"id": "B", "content": "选项 B"}],
        "hints": ["提示 1", "提示 2"],
        "solution": "解析内容",
        "reference_answer": "参考答案",
        "feedback": {
            "correct": "正确反馈",
            "incorrect": "错误反馈",
            "choices": {"A": "A 反馈", "B": "B 反馈"},
        },
    }
    field_paths = {f.path for f in iter_question_markdown_fields(question_data)}
    assert field_paths == {
        "stem",
        "choices[0].content",
        "choices[1].content",
        "hints[0]",
        "hints[1]",
        "solution",
        "reference_answer",
        "feedback.correct",
        "feedback.incorrect",
        "feedback.choices.A",
        "feedback.choices.B",
    }


def test_repository_math_audit_baseline() -> None:
    questions, issues = load_tree(REPO_ROOT / "question-bank" / "questions")
    assert not issues, f"YAML loading issues: {issues}"
    assert len(questions) == 87, f"Expected 87 questions, got {len(questions)}"

    summary, diagnostics = audit_repository(questions)
    assert summary.total_questions == 87
    assert summary.published_questions == 79
    assert summary.questions_with_display_math == 46

    # Verify that all 46 questions with $$ display math are published
    display_questions = [
        q for q in questions if any("$$" in f.text for f in iter_question_markdown_fields(q.data))
    ]
    assert len(display_questions) == 46
    assert all(q.data.get("status") == "published" for q in display_questions)

    # Verify that all source changes required have been migrated (0 remaining)
    assert summary.source_change_required_count == 0
    assert summary.source_change_required_questions == []

    # Verify no unclosed display delimiters in repository
    assert summary.diagnostics_by_kind.get("unclosed-display", 0) == 0
