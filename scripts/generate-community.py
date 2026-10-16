"""从 GitHub Issues 中提取[投稿-已收录]标签的内容，安全生成社区角页面。"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from urllib.request import Request, urlopen
import yaml


GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "Physics-Learning-Wiki/Physics-Learning-Wiki"

SNIPPET_PATTERN = re.compile(r"--8<--\s*", re.IGNORECASE)
DANGEROUS_HTML_PATTERN = re.compile(
    r"<\s*(?:script|iframe|object|embed|form|input|button|link|style)\b",
    re.IGNORECASE,
)
GITHUB_ISSUE_URL_RE = re.compile(
    r"^https://github\.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/\d+$"
)


def sanitize_community_markdown(content: str) -> str:
    """中和不可信 Markdown 中的 PyMdown Snippets 包含与危险 HTML 标签，并调整层级。"""
    # 破坏 Snippets 指令
    safe = SNIPPET_PATTERN.sub("<!-- snippet disabled -->", content)
    # 转义危险 HTML 标签
    safe = DANGEROUS_HTML_PATTERN.sub(lambda m: "&lt;" + m.group(0)[1:], safe)
    # 遵循 LINT-1: 禁止在正文中使用 # 一级标题，将其降为 ##
    safe = re.sub(r"(?m)^#\s+", "## ", safe)
    return safe.strip()


def fetch_issues() -> list[dict]:
    """通过 GitHub API 获取已收录的投稿 Issues。"""
    url = f"https://api.github.com/repos/{REPO}/issues"
    params = "?labels=投稿-已收录&state=open&per_page=100"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "User-Agent": "Physics-Learning-Wiki-Bot",
    }
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
        info["type"] = re.sub(r"[\r\n]+", " ", type_match.group(1)).strip()

    chapter_match = re.search(r"目标章节\*\*:\s*(.+?)(?:\n|$)", body)
    if chapter_match:
        info["chapter"] = re.sub(r"[\r\n]+", " ", chapter_match.group(1)).strip()

    attr_match = re.search(r"署名\*\*:\s*(.+?)(?:\n|$)", body)
    if attr_match:
        info["attribution"] = re.sub(r"[\r\n]+", " ", attr_match.group(1)).strip()

    return info


def generate_page(issue: dict, output_dir: Path) -> str:
    """为单个投稿安全生成 Markdown 页面。"""
    number = issue["number"]
    raw_title = issue.get("title", "").replace("[投稿]", "").strip()
    title = re.sub(r"[\r\n]+", " ", raw_title)[:120].strip() or f"社区稿件 #{number}"
    body = issue.get("body") or ""
    info = parse_issue_body(body)
    created = issue.get("created_at", "")[:10]

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
        "author": info["attribution"][:60] or "匿名",
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
            title = re.sub(r"[\r\n]+", " ", raw_title)[:120].strip() or f"社区稿件 #{number}"
            # 转义标题中的中括号，避免破坏 Markdown 链接
            safe_link_title = title.replace("[", "\\[").replace("]", "\\]")
            info = parse_issue_body(issue.get("body") or "")
            created = issue.get("created_at", "")[:10]

            lines.append(f"## [{safe_link_title}]({number}.md)")
            lines.append("")
            lines.append(
                f"投稿者：{info['attribution']} | "
                f"类型：{info['type']} | "
                f"日期：{created}"
            )
            if info["chapter"] and info["chapter"] != "未指定":
                lines.append(f" | 目标章节：{info['chapter']}")
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
        print("Skipping community page generation.")
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
