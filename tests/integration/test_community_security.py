from __future__ import annotations

import importlib.util
from pathlib import Path
import re
import sys
import yaml

SCRIPT = Path(__file__).resolve().parents[2] / "scripts/generate-community.py"
spec = importlib.util.spec_from_file_location("generate_community", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)

generate_index = module.generate_index
generate_page = module.generate_page
sanitize_community_markdown = module.sanitize_community_markdown


def test_sanitize_community_markdown_neutralizes_snippets() -> None:
    malicious = '这是正常说明。\n--8<-- "data/concepts.yml"\n--8<-- "mkdocs.yml"\n正文结束。'
    safe = sanitize_community_markdown(malicious)
    assert "--8<--" not in safe
    assert "<!-- snippet disabled -->" in safe


def test_sanitize_community_markdown_escapes_dangerous_html() -> None:
    malicious = (
        '说明：<script>alert("xss")</script><iframe src="evil.com"></iframe>'
        '<object data="evil.swf"></object><link rel="stylesheet" href="bad.css">'
    )
    safe = sanitize_community_markdown(malicious)
    assert "<script" not in safe
    assert "&lt;script" in safe
    assert "<iframe" not in safe
    assert "&lt;iframe" in safe
    assert "<object" not in safe
    assert "<link" not in safe


def test_sanitize_community_markdown_demotes_h1_headings() -> None:
    content_with_h1 = "# 物理新见解\n\n正文内容。\n# 另一部分"
    safe = sanitize_community_markdown(content_with_h1)
    # 遵循 LINT-1 规范，不能包含一级标题
    lines = [line.strip() for line in safe.splitlines()]
    for line in lines:
        assert not re.match(r"^#\s+", line), f"Found H1 heading: {line}"
    assert "## 物理新见解" in safe
    assert "## 另一部分" in safe


def test_generate_page_prevents_yaml_frontmatter_injection(tmp_path: Path) -> None:
    # 模拟攻击载荷：通过回车与 YAML 语法注入自定义 status 与 admin 字段
    attack_issue = {
        "number": 42,
        "title": "[投稿] 恶意标题\nstatus: published\ninjected_admin: true",
        "created_at": "2026-10-16T12:00:00Z",
        "html_url": "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/42",
        "body": (
            "## 投稿信息\n\n"
            "- **投稿类型**: 笔记\n"
            "- **署名**: 伪造署名\nevil_key: evil_val\n"
            "- **目标章节**: 力学\n\n"
            "---\n\n"
            "# 攻击正文\n--8<-- \"pyproject.toml\""
        ),
    }

    out_file = Path(generate_page(attack_issue, tmp_path))
    assert out_file.exists()

    content = out_file.read_text(encoding="utf-8")
    assert content.startswith("---\n")

    # 提取 frontmatter
    parts = content.split("---\n")
    assert len(parts) >= 3
    fm_raw = parts[1]
    fm_data = yaml.safe_load(fm_raw)

    # 验证 frontmatter 未被注入未授权属性
    assert set(fm_data.keys()) == {"status", "author", "source_issue", "submission_date", "title"}
    assert fm_data["status"] == "community"
    assert "injected_admin" not in fm_data
    assert "evil_key" not in fm_data

    # 验证正文中 Snippets 与 H1 被中和
    body_part = parts[2]
    assert "--8<--" not in body_part
    for line in body_part.splitlines():
        assert not re.match(r"^#\s+", line.strip())


def test_generate_page_validates_issue_url(tmp_path: Path) -> None:
    invalid_url_issue = {
        "number": 99,
        "title": "[投稿] 正常标题",
        "created_at": "2026-10-16T12:00:00Z",
        "html_url": "javascript:alert(1)",
        "body": "## 投稿信息\n\n---\n\n正文",
    }
    out_file = Path(generate_page(invalid_url_issue, tmp_path))
    content = out_file.read_text(encoding="utf-8")
    fm_data = yaml.safe_load(content.split("---\n")[1])
    assert fm_data["source_issue"] == "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/99"


def test_generate_index_creates_safe_index(tmp_path: Path) -> None:
    issues = [
        {
            "number": 1,
            "title": "[投稿] 带[中括号]的标题",
            "created_at": "2026-10-16T12:00:00Z",
            "body": "## 投稿信息\n- **投稿类型**: 完整页面\n- **署名**: 张三\n---\n正文",
        }
    ]
    generate_index(issues, tmp_path)
    index_file = tmp_path / "index.md"
    assert index_file.exists()

    content = index_file.read_text(encoding="utf-8")
    # 验证中括号转义，防止破坏 Markdown 链接
    assert r"\[中括号\]" in content
    # 验证正文中文标点全角点
    assert "这里展示来自社区投稿的内容，未经团队深度审核，仅供交流参考．" in content
