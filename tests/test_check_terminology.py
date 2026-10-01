"""Real editorial mistakes and protected Markdown syntax for the manual checker."""

import importlib.util
import json
import sys
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/check-terminology.py"
spec = importlib.util.spec_from_file_location("check_terminology", SCRIPT)
checker = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = checker
spec.loader.exec_module(checker)


@pytest.fixture
def repository(tmp_path):
    (tmp_path / "docs").mkdir()
    (tmp_path / "mkdocs.yml").write_text("exclude_docs: |\n  superpowers/\n  adr/\n  ref-images/\n", encoding="utf-8")
    return tmp_path


def page(root, text, name="example.md"):
    path = root / "docs" / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


def test_real_hard_errors_and_source_location(repository):
    path = page(repository, "## 能量均分\n\n#### 绝热指数（泊松比）\n\n碰撞的冲量参数．\n")
    result = checker.check_file(path)
    assert [(f.rule, f.line, f.column) for f in result] == [("T003", 3, 6), ("T004", 5, 4)]


def test_naming_policy_and_legal_contexts_are_not_errors(repository):
    path = page(repository, "费曼、海森堡、菲涅尔、范德瓦尔斯、史瓦西、约当．\n向量空间与位置矢量不同语境；微分算子与量子算符并存．\n泊松比属于弹性力学，绝热指数属于热学．\n")
    result = checker.check_file(path)
    assert result and all(f.level == "warning" for f in result)


def test_poisson_ratio_comparison_is_not_mislabeling(repository):
    path = page(repository, "绝热指数不等于泊松比．\n绝热指数与泊松比属于不同概念．\n绝热指数又称泊松比．\n")
    assert [(f.rule, f.line) for f in checker.check_file(path)] == [("T003", 3)]


@pytest.mark.parametrize("protected", [
    "```python\nprint('坚直')\n```\n", "~~~text\n坚直\n~~~\n", "    坚直\n",
    "`坚直` 与 ``坚直 ` 字符``\n", "$\\text{坚直}$ 与 $$\\text{冲量参数}$$\n",
    r"\(坚直\) 与 \[冲量参数\]" + "\n",
    "[正常术语](坚直.md)\n[ref]: 冲量参数.md\n", '<img alt="坚直" src="冲量参数.png">\n',
    "<!-- 坚直 -->\n", "## 正确术语 {#绝热指数泊松比}\n",
    "```mermaid\nA[坚直]-->B[冲量参数]\n```\n",
])
def test_protected_syntax(repository, protected):
    assert checker.check_file(page(repository, protected)) == []


def test_admonition_prose_is_checked_even_when_indented(repository):
    result = checker.check_file(page(repository, '??? note "说明"\n\n    坚直方向．\n'))
    assert len(result) == 1 and result[0].line == 3 and result[0].column == 5


def test_metadata_description_and_link_labels_are_prose(repository):
    result = checker.check_file(page(repository, '---\nauthor: 坚直\ndescription: 坚直方向\n---\n\n[冲量参数](correct.md)\n'))
    assert [f.line for f in result] == [3, 6]


def test_justified_alias_exemption_is_local(repository):
    path = page(repository, '<!-- terminology-ignore: T103 -- 首次解释旧称 -->\n状态方程是物态方程的别名．\n状态方程\n')
    assert [f.line for f in checker.check_file(path)] == [3]


@pytest.mark.parametrize("marker", ["<!-- terminology-ignore: T103 -->", "<!-- terminology-ignore: T999 -- unknown -->"])
def test_invalid_exemptions_fail_configuration(repository, marker):
    page(repository, marker + "\n状态方程\n")
    assert checker.main(["--root", str(repository)]) == 2


def test_cli_exclusions_json_exit_codes_and_read_only(repository, capsys):
    valid = page(repository, "正常正文．\n")
    hidden = page(repository, "坚直\n", "superpowers/plans/internal.md")
    before = {p: p.read_bytes() for p in (valid, hidden)}
    assert checker.main(["--root", str(repository), "--format", "json"]) == 0
    result = json.loads(capsys.readouterr().out)
    assert result == {"files": 1, "findings": []}
    assert checker.main([str(hidden), "--root", str(repository)]) == 0
    valid.write_text("坚直\n", encoding="utf-8")
    assert checker.main([str(valid), "--root", str(repository)]) == 1
    assert hidden.read_bytes() == before[hidden]
    assert valid.read_text(encoding="utf-8") == "坚直\n"
    assert checker.main([str(repository / "absent.md"), "--root", str(repository)]) == 2


def test_inventory_is_reproducible_and_counts_visible_labels(repository, capsys):
    page(repository, "[矢量](向量.md)与 `向量`．\n")
    args = ["--root", str(repository), "--inventory"]
    assert checker.main(args) == 0
    first = capsys.readouterr().out
    assert checker.main(args) == 0
    assert first == capsys.readouterr().out
    data = json.loads(first)
    assert data["terms"]["矢量"]["count"] == 1
    assert data["terms"]["向量"]["count"] == 0


def test_invalid_configuration_returns_two(repository):
    (repository / "mkdocs.yml").write_text("exclude_docs: [adr/]", encoding="utf-8")
    assert checker.main(["--root", str(repository)]) == 2
