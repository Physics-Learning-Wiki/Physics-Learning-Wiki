from __future__ import annotations

import json
from pathlib import Path

from hooks.clean_search_index import clean_latex, process_search_index


def test_clean_latex_inline_and_block():
    raw = "牛顿极限：等效原理 \\(\\mathbf{a}=\\mathbf{g}\\)"
    assert clean_latex(raw) == "牛顿极限：等效原理 a=g"

    math_block = "能量方程：\\[ E = mc^2 \\]"
    assert clean_latex(math_block) == "能量方程： E = mc^2"


def test_clean_latex_nested_macros():
    raw = "\\(\\boldsymbol{\\mathbf{r}}(t)\\)"
    assert clean_latex(raw) == "r(t)"

    text_macro = "\\(\\text{d}U = T\\text{d}S - p\\text{d}V\\)"
    assert clean_latex(text_macro) == "dU = TdS - pdV"


def test_clean_latex_physics_variables_and_symbols():
    raw = "当 \\(\\Delta t \\to 0\\) 时，速度为 \\(\\boldsymbol{v}(t)\\)"
    assert clean_latex(raw) == "当 Delta t -> 0 时，速度为 v(t)"

    symbols = "Nabla 算子 (\\(\\nabla\\)) 与 \\(\\delta\\) 函数"
    assert clean_latex(symbols) == "Nabla 算子 ( nabla ) 与 delta 函数"

    fraction = "动能公式：\\(\\frac{1}{2}mv^2\\)"
    assert clean_latex(fraction) == "动能公式： 1/2mv^2"


def test_clean_latex_no_math():
    text = "这是一段完全没有公式的普通文本。"
    assert clean_latex(text) == text
    assert clean_latex("") == ""


def test_process_search_index_file(tmp_path: Path):
    search_dir = tmp_path / "search"
    search_dir.mkdir(parents=True)
    index_file = search_dir / "search_index.json"

    initial_data = {
        "docs": [
            {
                "location": "mechanics/newton/",
                "title": "等效原理 \\(\\mathbf{a}=\\mathbf{g}\\)",
                "text": "由 \\(F=ma\\) 可以导出加速度表达式。",
            },
            {
                "location": "math/calculus/",
                "title": "微积分基本定理",
                "text": "普通纯文本内容。",
            },
        ]
    }
    index_file.write_text(json.dumps(initial_data, ensure_ascii=False), encoding="utf-8")

    modified_count = process_search_index(index_file)
    assert modified_count == 1

    updated_data = json.loads(index_file.read_text(encoding="utf-8"))
    assert updated_data["docs"][0]["title"] == "等效原理 a=g"
    assert updated_data["docs"][0]["text"] == "由 F=ma 可以导出加速度表达式。"
    assert updated_data["docs"][1]["title"] == "微积分基本定理"

    # Test idempotence (running again does not corrupt or change)
    second_modified = process_search_index(index_file)
    assert second_modified == 0
