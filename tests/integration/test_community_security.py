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


def test_metadata_sanitization_neutralizes_html_and_markdown_injection(tmp_path: Path) -> None:
    malicious_issue = {
        "number": 999,
        "title": '[投稿] <script>alert("title-xss")</script><img src=x onerror=alert(1)>恶意标题',
        "created_at": "2026-10-16T12:00:00Z",
        "html_url": "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/999",
        "body": (
            "## 投稿信息\n\n"
            "- **投稿类型**: <svg onload=alert('type-xss')>笔记\n"
            '- **署名**: <img src=x onerror="alert(\'author-xss\')">[攻击者](javascript:alert(1))\n'
            '- **目标章节**: <iframe src="https://evil.com">力学</iframe>\n\n'
            "---\n\n"
            "正文内容"
        ),
    }

    # 1. 验证生成的单页 frontmatter 与正文
    page_file = Path(generate_page(malicious_issue, tmp_path))
    content = page_file.read_text(encoding="utf-8")
    fm = yaml.safe_load(content.split("---\n")[1])

    # 元数据中的 HTML 标签已被完全剥除，且无 XSS 属性
    assert "<script" not in fm["author"]
    assert "onerror" not in fm["author"]
    assert "javascript:" not in fm["author"]
    assert "<iframe" not in content
    assert "<svg" not in content

    # 2. 验证生成的社区索引页 index.md
    generate_index([malicious_issue], tmp_path)
    index_file = tmp_path / "index.md"
    index_content = index_file.read_text(encoding="utf-8")

    assert "<script" not in index_content
    assert "<img" not in index_content
    assert "onerror" not in index_content
    assert "<iframe" not in index_content
    assert "<svg" not in index_content
    assert "onload" not in index_content
    assert "javascript:" not in index_content


def test_sanitize_community_markdown_comprehensive_xss_neutralization() -> None:
    malicious = (
        '这是包含各种攻击向量的 Markdown:\n\n'
        '<img src="https://example.com/pic.png" onerror="alert(1)" alt="图片">\n'
        '<a href="javascript:alert(\'click-xss\')">恶意链接</a>\n'
        '[Markdown伪协议链接](javascript:alert(1))\n'
        '[数据协议链接](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)\n'
        '<svg onload="alert(1)"></svg>\n'
        '<details ontoggle="alert(1)"><summary>折叠</summary>内容</details>\n'
        '<body onload="alert(1)">\n'
        '--8<-- "secrets.yml"\n'
        '# 页面大标题\n'
    )
    safe = sanitize_community_markdown(malicious)

    # 验证关键危险特征均被消除
    assert "onerror" not in safe
    assert "onload" not in safe
    assert "ontoggle" not in safe
    assert "javascript:" not in safe
    assert "data:text/html" not in safe
    assert "--8<--" not in safe
    assert not re.search(r"(?m)^#\s+", safe)
    # 不在白名单的标签被转义
    assert "<svg" not in safe
    assert "&lt;svg" in safe
    assert "<body" not in safe
    assert "&lt;body" in safe


def test_end_to_end_community_security_with_markdown_rendering(tmp_path: Path) -> None:
    import markdown
    from bs4 import BeautifulSoup

    malicious_issue = {
        "number": 888,
        "title": '[投稿] <img src=x onerror=alert(1)>光电效应的波粒二象性探讨',
        "created_at": "2026-10-16T12:00:00Z",
        "html_url": "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/888",
        "body": (
            "## 投稿信息\n\n"
            "- **投稿类型**: <script>alert(1)</script>完整页面\n"
            '- **署名**: <img src="x" onerror="window.__author_xss = true">波尔\n'
            '- **目标章节**: 量子力学初步\n\n'
            "---\n\n"
            "爱因斯坦在 1905 年提出了光量子假说，光子能量为 $E = h\\nu$．\n\n"
            '<img src="https://example.com/photoelectric.png" onerror="window.__body_xss = true" alt="实验图">\n'
            '<a href="javascript:window.__link_xss = true">详情点击</a>\n'
            '[Markdown攻击链接](javascript:window.__md_xss = true)\n'
            '<iframe src="https://evil.com"></iframe>\n'
            '<svg onload="window.__svg_xss = true"></svg>\n'
            '--8<-- "data/concepts.yml"\n'
        ),
    }

    # 1. 生成单页与索引页
    page_path = Path(generate_page(malicious_issue, tmp_path))
    generate_index([malicious_issue], tmp_path)
    index_path = tmp_path / "index.md"

    # 2. 模拟 Markdown 渲染为 HTML
    page_md = page_path.read_text(encoding="utf-8")
    # 剥除 frontmatter 后渲染 body
    body_md = page_md.split("---\n")[2]
    page_html = markdown.markdown(body_md, extensions=["tables", "fenced_code"])

    index_md = index_path.read_text(encoding="utf-8")
    index_html = markdown.markdown(index_md, extensions=["tables", "fenced_code"])

    # 3. 使用 BeautifulSoup 解析并深度审查渲染后的 DOM
    for name, rendered_html in [("page", page_html), ("index", index_html)]:
        soup = BeautifulSoup(rendered_html, "html.parser")

        # 绝对禁止任何 script 标签
        scripts = soup.find_all("script")
        assert len(scripts) == 0, f"Found <script> in {name}: {scripts}"

        # 绝对禁止任何 iframe 标签
        iframes = soup.find_all("iframe")
        assert len(iframes) == 0, f"Found <iframe> in {name}: {iframes}"

        # 绝对禁止任何 svg 标签
        svgs = soup.find_all("svg")
        assert len(svgs) == 0, f"Found <svg> in {name}: {svgs}"

        # 检查所有元素的属性：绝对禁止任何 on* 事件监听器
        for tag in soup.find_all(True):
            for attr_name in tag.attrs:
                assert not attr_name.lower().startswith("on"), (
                    f"Found event handler {attr_name} in {name}: {tag}"
                )
            # 检查链接和图片地址：禁止 javascript: 和 data: 伪协议
            if tag.name == "a" and tag.has_attr("href"):
                href = tag["href"].strip().lower()
                assert not href.startswith("javascript:"), f"Found javascript: in {name}: {href}"
                assert not href.startswith("data:"), f"Found data: in {name}: {href}"
            if tag.name == "img" and tag.has_attr("src"):
                src = tag["src"].strip().lower()
                assert not src.startswith("javascript:"), f"Found javascript: in {name}: {src}"

        # 验证 Snippets 被中和
        assert "--8<--" not in rendered_html
