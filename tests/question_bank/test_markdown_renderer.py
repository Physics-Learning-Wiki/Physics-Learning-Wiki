import copy
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

from scripts.question_bank.loader import load_yaml
from scripts.question_bank.markdown_renderer import (
    normalize_compact_display_math,
    render_markdown,
)
from scripts.question_bank.media import question_content_fingerprint


def test_math_markup_survives_sanitizing() -> None:
    rendered = render_markdown(r"速度为 \(v\)")
    assert "arithmatex" in rendered


@pytest.mark.parametrize(
    "tex",
    [
        r"\sum_{i<j}c_i c_j\operatorname{Cov}(X_i,X_j)",
        r"x>y",
        r"\begin{pmatrix}a&b\\c&d\end{pmatrix}",
        r"\text{&lt;}",
        r"\text{<img src=x>}",
    ],
)
@pytest.mark.parametrize(
    "template",
    [
        "$$\n{tex}\n$$",
        "$${tex}$$",
        "> $$\n> {tex}\n> $$",
        "1. 结论：\n\n    $$\n    {tex}\n    $$",
        "```math\n{tex}\n```",
    ],
)
def test_display_math_preserves_html_characters(tex: str, template: str) -> None:
    source = template.format(tex=tex) + "\n\n公式之后的说明．"
    soup = BeautifulSoup(render_markdown(source), "html.parser")

    formulas = soup.select("div.arithmatex")
    assert len(formulas) == 1
    assert formulas[0].get_text().strip() == f"\\[\n{tex}\n\\]"
    assert formulas[0].find(True) is None

    following_prose = soup.find("p", string="公式之后的说明．")
    assert following_prose is not None
    assert following_prose.find_parent(class_="arithmatex") is None


def test_covariance_solution_preserves_formula_and_following_prose() -> None:
    root = Path.cwd()
    doc, issues = load_yaml(
        root / "question-bank/questions/experiment/error-analysis/uncertainty-propagation/q-000198.yml"
    )
    assert doc is not None
    assert not issues
    original_data = copy.deepcopy(doc.data)
    initial_fingerprint = question_content_fingerprint(doc.data, root)

    soup = BeautifulSoup(render_markdown(doc.data["solution"]), "html.parser")
    formulas = soup.select("div.arithmatex")
    assert len(formulas) == 3
    expected_tex = r"u_c^2=\sum_i c_i^2u^2(x_i)+2\sum_{i<j}c_i c_j\operatorname{Cov}(X_i,X_j)."
    assert formulas[-1].get_text().strip() == f"\\[\n{expected_tex}\n\\]"
    assert formulas[-1].find(True) is None
    following_prose = formulas[-1].find_next_sibling("p")
    assert following_prose is not None
    assert following_prose.get_text() == "不相关时交叉项为零；显著非线性时还需检查高阶影响．"

    assert doc.data == original_data
    assert question_content_fingerprint(doc.data, root) == initial_fingerprint


def test_script_markup_is_removed() -> None:
    rendered = render_markdown("<script>alert(1)</script>安全")
    assert "<script" not in rendered


def test_managed_asset_reference_becomes_inert_placeholder() -> None:
    rendered = render_markdown("![斜面上的方块](asset:block)")
    assert 'data-plw-asset="block"' in rendered
    assert 'alt="斜面上的方块"' in rendered


def test_normalize_top_level_compact_display() -> None:
    src = "$$E = mc^2$$"
    norm = normalize_compact_display_math(src)
    assert norm == "$$\nE = mc^2\n$$\n"

    rendered = render_markdown(src)
    assert '<div class="arithmatex">' in rendered
    assert r"\[" in rendered
    assert r"\]" in rendered
    assert "E = mc^2" in rendered
    assert "$" not in rendered


def test_normalize_top_level_with_indentation() -> None:
    src = "   $$E = mc^2$$"
    norm = normalize_compact_display_math(src)
    assert norm == "   $$\n   E = mc^2\n   $$\n"

    rendered = render_markdown(src)
    assert '<div class="arithmatex">' in rendered
    assert "$" not in rendered


def test_normalize_list_item_compact_display() -> None:
    src = "1. 结论：\n   $$E=mc^2$$"
    rendered = render_markdown(src)
    assert "<ol>" in rendered
    assert "<li>" in rendered
    assert '<div class="arithmatex">' in rendered
    assert "E=mc^2" in rendered
    assert "</ol>" in rendered
    assert "$" not in rendered


def test_normalize_nested_list_compact_display() -> None:
    src = "1. 结论：\n   - 子项：\n     $$E=mc^2$$"
    rendered = render_markdown(src)
    assert "<ol>" in rendered
    assert "<li>" in rendered
    assert "子项：" in rendered
    assert '<div class="arithmatex">' in rendered
    assert "$" not in rendered


def test_normalize_blockquote_compact_display() -> None:
    src = "> $$E=mc^2$$"
    norm = normalize_compact_display_math(src)
    assert norm == "> $$\n> E=mc^2\n> $$\n"

    rendered = render_markdown(src)
    assert "<blockquote>" in rendered
    assert '<div class="arithmatex">' in rendered
    assert "</blockquote>" in rendered


def test_normalize_chinese_prose_before_formula() -> None:
    src = "由高斯定理：\n   $$E=mc^2$$"
    rendered = render_markdown(src)
    assert "由高斯定理：" in rendered
    assert '<div class="arithmatex">' in rendered
    assert "$" not in rendered


def test_formula_with_escaped_dollar_tex() -> None:
    src = r"$$\text{cost is \$5}$$"
    norm = normalize_compact_display_math(src)
    assert norm == "$$\n\\text{cost is \\$5}\n$$\n"

    rendered = render_markdown(src)
    assert '<div class="arithmatex">' in rendered
    assert r"\text{cost is \$5}" in rendered


def test_code_fence_and_code_span_not_normalized() -> None:
    fence_src = "```text\n$$E=mc^2$$\n```"
    assert normalize_compact_display_math(fence_src) == fence_src
    rendered_fence = render_markdown(fence_src)
    assert "$$E=mc^2$$" in rendered_fence

    span_src = "`$$E=mc^2$$`"
    assert normalize_compact_display_math(span_src) == span_src
    rendered_span = render_markdown(span_src)
    assert "<code>$$E=mc^2$$</code>" in rendered_span


def test_embedded_prose_not_normalized() -> None:
    src = "由高斯定理 $$E=mc^2$$ 可得"
    assert normalize_compact_display_math(src) == src


def test_source_immutability_and_fingerprint_invariant() -> None:
    root = Path.cwd()
    doc, issues = load_yaml(root / "question-bank" / "questions" / "math" / "complex-analysis" / "integrals-series" / "q-000043.yml")
    assert doc is not None
    assert not issues

    original_data = copy.deepcopy(doc.data)
    initial_fingerprint = question_content_fingerprint(doc.data, root)

    # Render solution and stem
    rendered_stem = render_markdown(doc.data["stem"])
    rendered_sol = render_markdown(doc.data["solution"])

    assert '<div class="arithmatex">' in rendered_sol
    assert doc.data == original_data

    post_render_fingerprint = question_content_fingerprint(doc.data, root)
    assert post_render_fingerprint == initial_fingerprint
