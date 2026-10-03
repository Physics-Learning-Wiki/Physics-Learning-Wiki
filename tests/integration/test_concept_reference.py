from __future__ import annotations

import json
from pathlib import Path

import pytest
import yaml
from bs4 import BeautifulSoup
from mkdocs.commands.build import build
from mkdocs.config import load_config
from mkdocs.exceptions import Abort, PluginError

from scripts.concepts.compiler import load_registry

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def concept_site(tmp_path):
    (tmp_path / "data").mkdir()
    (tmp_path / "docs" / "chapter").mkdir(parents=True)
    (tmp_path / "docs" / "math").mkdir()
    registry = tmp_path / "data" / "concepts.yml"
    registry.write_text(yaml.safe_dump({"version": 1, "concepts": {
        "derivative": {"name": "导数", "summary": "局部变化率", "target": "math/tool.md#定义"},
        "momentum": {"name": "动量", "english": "Momentum", "aliases": ["测试别名"],
                     "summary": '<b>文本</b></script><script>alert("x")</script>', "target": "math/tool.md"},
    }}, allow_unicode=True), encoding="utf-8")
    (tmp_path / "docs" / "math" / "tool.md").write_text('# 工具\n\n<a id="定义"></a>\n\n正文。', encoding="utf-8")
    source = tmp_path / "docs" / "chapter" / "page.md"
    config_file = tmp_path / "mkdocs.yml"
    config_file.write_text(yaml.safe_dump({
        "site_name": "Concept fixture", "site_url": "https://example.com/wiki/", "strict": False,
        "hooks": [str(ROOT / "hooks" / "concept_reference.py")],
        "markdown_extensions": ["admonition", "tables", "pymdownx.superfences", "pymdownx.arithmatex"],
    }), encoding="utf-8")

    def run(markdown, directory_urls=True):
        source.write_text(markdown, encoding="utf-8")
        config = load_config(str(config_file), use_directory_urls=directory_urls)
        build(config)
        dest = tmp_path / "site" / "chapter" / ("page/index.html" if directory_urls else "page.html")
        return BeautifulSoup(dest.read_text(encoding="utf-8"), "html.parser"), config

    return run, tmp_path, registry


def test_references_prerequisites_and_safe_data(concept_site):
    run, _, _ = concept_site
    soup, _ = run('''---
prerequisites: [momentum, derivative]
---
# 页面

[导数](concept:derivative)，再次[变化率](concept:derivative)。

- [动量](concept:momentum)

| 概念 |
| --- |
| [导数](concept:derivative) |

!!! note
    [动量](concept:momentum)
''')
    refs = soup.select("a[data-plw-concept]")
    assert len(refs) == 5
    assert refs[0]["href"].startswith("../../math/tool/#")
    nav = soup.select_one(".plw-prerequisites")
    assert [a.text for a in nav.select("a")] == ["动量", "导数"]
    assert not nav.select("[data-plw-concept]")
    assert nav.find_previous_sibling().name == "h1"
    data = soup.select_one("script[data-plw-concepts]")
    assert data["data-pagefind-ignore"] == "all"
    payload = json.loads(data.string)
    assert list(payload) == ["derivative", "momentum"]
    assert '<script>alert("x")</script>' in payload["momentum"]["summary"]
    assert "<script>" not in data.string
    assert payload["derivative"]["href"] == "../../math/tool/#%E5%AE%9A%E4%B9%89"
    assert soup.find("script", string='alert("x")') is None


def test_prerequisites_only_and_flat_urls(concept_site):
    run, _, _ = concept_site
    soup, _ = run('---\nprerequisites: [derivative]\n---\n# 页面\n\n正文', False)
    assert soup.select_one(".plw-prerequisites a")["href"] == "../math/tool.html#%E5%AE%9A%E4%B9%89"
    assert not soup.select("[data-plw-concepts], [data-plw-concept]")


def test_code_math_and_glossary_marker(concept_site):
    run, _, _ = concept_site
    soup, _ = run('''# 页面

`[导数](concept:unknown)`

```markdown
[导数](concept:unknown)
<!-- plw:glossary-entry unknown -->
```

$[导数](concept:unknown)$

<!-- plw:glossary-entry momentum -->
''')
    assert not soup.select("[data-plw-concepts], [data-plw-concept]")
    assert "测试别名" in soup.get_text()
    assert "[导数](concept:unknown)" in soup.select_one("code").text
    assert soup.select_one('a[href="../../math/tool/"]') is not None
    assert soup.find("script", string='alert("x")') is None


@pytest.mark.parametrize("markdown, message", [
    ("[错误](concept:unknown)", "unknown concept ID"),
    ("# [标题](concept:derivative)", "headings or images"),
    ("![图片](concept:derivative)", "headings or images"),
    ("---\nprerequisites: [derivative, derivative]\n---\n正文", "duplicate prerequisite"),
    ("---\nprerequisites: derivative\n---\n正文", "list of concept IDs"),
    ("<!-- plw:glossary-entry unknown -->", "unknown concept ID"),
])
def test_invalid_page_fails_without_strict_mode(concept_site, markdown, message, caplog):
    run, _, _ = concept_site
    with pytest.raises(Abort):
        run(markdown)
    assert message in caplog.text
    assert "chapter/page.md" in caplog.text


def test_targets_and_repeated_build(concept_site, caplog):
    run, root, registry = concept_site
    soup, config = run("[导数](concept:derivative)")
    source = root / "docs" / "chapter" / "page.md"
    source.write_text("# 无引用", encoding="utf-8")
    build(config)
    assert "data-plw-concepts" not in (root / "site/chapter/page/index.html").read_text(encoding="utf-8")
    (root / "docs/math/tool.md").write_text("# 无锚点", encoding="utf-8")
    with pytest.raises(Abort):
        run("[导数](concept:derivative)")
    assert "missing target anchor" in caplog.text
    (root / "docs/math/tool.md").unlink()
    with pytest.raises(Abort):
        run("正文")
    assert "target file does not exist" in caplog.text
    assert source.read_text(encoding="utf-8") == "正文"


@pytest.mark.parametrize("text, message", [
    ("version: 1\nconcepts:\n  x: {}\n  x: {}", "duplicate key"),
    ("version: 1\nconcepts:\n  x:\n    name: A\n    name: B", "duplicate key"),
    ("version: true\nconcepts: {}", "version: 1"),
    ("version: 1\nconcepts:\n  x: {name: X}", "summary"),
    ("version: 1\nconcepts:\n  x: {name: X, summary: Y, target: ../x.md}", "docs-relative"),
    ("version: 1\nconcepts:\n  x: {name: X, summary: Y, target: https://example.com/x.md}", "docs-relative"),
])
def test_invalid_registry(tmp_path, text, message):
    path = tmp_path / "concepts.yml"
    path.write_text(text, encoding="utf-8")
    with pytest.raises(PluginError, match=message):
        load_registry(path)
