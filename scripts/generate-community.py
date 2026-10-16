"""从 GitHub Issues 中提取[投稿-已收录]标签的内容，安全生成社区角页面。"""
from __future__ import annotations

import html
import json
import os
import re
from pathlib import Path
from urllib.request import Request, urlopen
import bleach
import yaml


GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "Physics-Learning-Wiki/Physics-Learning-Wiki"

SNIPPET_PATTERN = re.compile(r"--8<--\s*", re.IGNORECASE)
GITHUB_ISSUE_URL_RE = re.compile(
    r"^https://github\.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/\d+$"
)

ALLOWED_COMMUNITY_TAGS = [
    "p", "br", "em", "strong", "del", "code", "pre", "blockquote",
    "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td",
    "h2", "h3", "h4", "h5", "h6", "hr", "span", "div", "a", "img",
    "sup", "sub", "details", "summary",
    "mjx-container", "mjx-math", "mjx-mrow", "mjx-mi", "mjx-mo", "mjx-mn",
]

ALLOWED_COMMUNITY_ATTRS = {
    "*": ["class", "id", "aria-label", "aria-hidden"],
    "a": ["href", "title", "target", "rel"],
    "img": ["src", "alt", "title", "width", "height"],
    "details": ["open"],
}

ALLOWED_PROTOCOLS = ["http", "https", "mailto"]


def sanitize_plain_metadata(val: str, max_len: int = 120) -> str:
    """清理元数据字段，剥除 HTML 标签、控制字符与危险协议，用于 YAML Front Matter。"""
    if not val:
        return ""
    # 去除控制字符与换行
    cleaned = re.sub(r"[\r\n\x00-\x1f\x7f]+", " ", str(val)).strip()
    # 剥除任何 HTML 标签
    cleaned = re.sub(r"<[^>]*>", "", cleaned)
    # 中和危险伪协议 (javascript:, data:, vbscript:)
    cleaned = re.sub(r"(?i)(?:javascript|data|vbscript)\s*:", "#blocked:", cleaned)
    return cleaned[:max_len].strip()


def sanitize_markdown_text(val: str, max_len: int = 120) -> str:
    """清理并安全转义用于 Markdown 正文显示的文本，剥除 HTML 标签并转义 HTML 实体。"""
    cleaned = sanitize_plain_metadata(val, max_len)
    return html.escape(cleaned, quote=True)


def escape_markdown_link_title(title: str) -> str:
    """转义 Markdown 链接括号，避免破坏 [title](url) 结构。"""
    return title.replace("[", r"\[").replace("]", r"\]")


def sanitize_metadata_field(val: str, max_len: int = 120) -> str:
    """兼容旧接口：清理元数据字段。"""
    return sanitize_plain_metadata(val, max_len)


def sanitize_community_markdown(content: str) -> str:
    """中和不可信 Markdown 中的 PyMdown Snippets、危险 HTML 与脚本注入，并调整层级。"""
    if not content:
        return ""
    # 1. 破坏 Snippets 指令 (CVE-2026-46338 防护)
    safe = SNIPPET_PATTERN.sub("<!-- snippet disabled -->", content)

    # 2. 遵循 LINT-1: 禁止在正文中使用 # 一级标题，将其降为 ##
    safe = re.sub(r"(?m)^#\s+", "## ", safe)

    # 3. 中和危险的 Markdown 链接伪协议 (javascript:, data:, vbscript:)
    safe = re.sub(
        r"(\]\s*\(\s*)(?:javascript|data|vbscript):([^\)]*\))",
        r"\1#blocked:\2",
        safe,
        flags=re.IGNORECASE,
    )

    # 4. 对正文中的 HTML 进行严格白名单过滤与安全转义
    def clean_html_tag(match: re.Match) -> str:
        tag_text = match.group(0)
        tag_name = match.group(2).lower()
        if tag_name not in ALLOWED_COMMUNITY_TAGS:
            # 不在白名单中的危险标签（如 script, iframe, object, embed, form, input, button, style, link, svg 等）
            return "&lt;" + tag_text[1:]
        # 白名单标签：使用 bleach 过滤非法属性（彻底剥除 onerror, onload, onclick, 限制 href/src 协议）
        cleaned = bleach.clean(
            tag_text,
            tags=ALLOWED_COMMUNITY_TAGS,
            attributes=ALLOWED_COMMUNITY_ATTRS,
            protocols=ALLOWED_PROTOCOLS,
            strip=True,
        )
        return cleaned

    safe = re.sub(r"<\s*(/)?\s*([a-zA-Z][a-zA-Z0-9:-]*)(?:\s+[^>]*)?>", clean_html_tag, safe)

    # 5. 防御性兜底：剔除任何可能遗漏的行内事件监听属性与 javascript 协议
    safe = re.sub(r"\bon[a-z]+\s*=\s*([\"'][^\"']*[\"']|[^\s>]+)", "", safe, flags=re.IGNORECASE)
    safe = re.sub(r"(href|src)\s*=\s*[\"']\s*(?:javascript|data|vbscript):[^\"']*[\"']", r'\1="#"', safe, flags=re.IGNORECASE)

    return safe.strip()


def fetch_issues() -> list[dict]:
    """通过 GitHub API 获取已收录的投稿 Issues。"""
    url = f"https://api.github.com/repos/{REPO}/issues"
    params = "?labels=投稿-已收录&state=open&per_page=100"
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "Physics-Learning-Wiki-Bot",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    req = Request(url + params, headers=headers)
    with urlopen(req) as resp:
        return json.loads(resp.read().decode())


def parse_issue_body(body: str) -> dict:
    """解析 Issue 正文，提取投稿元数据。"""
    info: dict = {"type": "未知", "chapter": "", "attribution": "匿名"}
    if not body:
        return info

    type_match = re.search(r"投稿类型\*\*:\s*(.+?)(?:\n|$)", body)
    if type_match:
        info["type"] = sanitize_plain_metadata(type_match.group(1), 60) or "未知"

    chapter_match = re.search(r"目标章节\*\*:\s*(.+?)(?:\n|$)", body)
    if chapter_match:
        info["chapter"] = sanitize_plain_metadata(chapter_match.group(1), 120)

    attr_match = re.search(r"署名\*\*:\s*(.+?)(?:\n|$)", body)
    if attr_match:
        info["attribution"] = sanitize_plain_metadata(attr_match.group(1), 60) or "匿名"

    return info


def generate_page(issue: dict, output_dir: Path) -> str:
    """为单个投稿安全生成 Markdown 页面。"""
    number = issue["number"]
    raw_title = issue.get("title", "").replace("[投稿]", "").strip()
    title = sanitize_plain_metadata(raw_title, 120) or f"社区稿件 #{number}"
    body = issue.get("body") or ""
    info = parse_issue_body(body)
    created = re.sub(r"[^\d\-]", "", issue.get("created_at", "")[:10])
    author = sanitize_plain_metadata(info["attribution"], 60) or "匿名"

    raw_issue_url = issue.get("html_url", "")
    source_issue = (
        raw_issue_url if GITHUB_ISSUE_URL_RE.match(raw_issue_url) else f"https://github.com/{REPO}/issues/{number}"
    )

    content = body
    separator_match = re.search(r"^---\s*$", body, re.MULTILINE)
    if separator_match:
        content = body[separator_match.end():].strip()

    safe_content = sanitize_community_markdown(content)

    frontmatter_dict = {
        "status": "community",
        "author": author,
        "source_issue": source_issue,
        "submission_date": created,
        "title": title,
    }
    frontmatter_yaml = yaml.safe_dump(frontmatter_dict, allow_unicode=True, sort_keys=False)

    # 规范：严禁在正文手工添加 # 一级标题，符合 LINT-1 规范（页面 H1 由主题模板根据 title 元数据渲染）
    page = f"---\n{frontmatter_yaml}---\n\n{safe_content}\n"

    output_file = output_dir / f"{number}.md"
    output_file.write_text(page, encoding="utf-8")
    return str(output_file)


def generate_index(issues: list[dict], output_dir: Path) -> None:
    """生成社区角首页。"""
    lines = [
        "---",
        "title: 社区角",
        "status: community",
        "---",
        "",
        "这里展示来自社区投稿的内容，未经团队深度审核，仅供交流参考．",
        "",
    ]

    if not issues:
        lines.append("*暂无社区投稿．快来[提交你的第一篇投稿](/submit/)吧！*")
    else:
        for issue in issues:
            number = issue["number"]
            raw_title = issue.get("title", "").replace("[投稿]", "").strip()
            title = sanitize_plain_metadata(raw_title, 120) or f"社区稿件 #{number}"
            safe_link_title = escape_markdown_link_title(title)
            info = parse_issue_body(issue.get("body") or "")
            created = re.sub(r"[^\d\-]", "", issue.get("created_at", "")[:10])
            safe_attr = sanitize_markdown_text(info["attribution"], 60) or "匿名"
            safe_type = sanitize_markdown_text(info["type"], 60) or "未知"
            safe_chapter = sanitize_markdown_text(info["chapter"], 120)

            lines.append(f"## [{safe_link_title}]({number}.md)")
            lines.append("")
            meta_line = (
                f"投稿者：{safe_attr} | "
                f"类型：{safe_type} | "
                f"日期：{created}"
            )
            if safe_chapter and safe_chapter != "未指定":
                meta_line += f" | 目标章节：{safe_chapter}"
            lines.append(meta_line)
            lines.append("")
            lines.append("---")
            lines.append("")

    output_file = output_dir / "index.md"
    output_file.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    output_dir = Path("docs/community")
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        issues = fetch_issues()
    except Exception as e:
        print(f"[WARNING] Failed to fetch issues: {e}")
        print("Ensuring fallback community index exists...")
        generate_index([], output_dir)
        return 0

    print(f"Found {len(issues)} published community submissions")

    for issue in issues:
        path = generate_page(issue, output_dir)
        print(f"  [OK] #{issue['number']}: {path}")

    generate_index(issues, output_dir)
    print("  [OK] Community index: docs/community/index.md")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
