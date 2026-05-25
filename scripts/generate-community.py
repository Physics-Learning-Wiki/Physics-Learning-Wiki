"""从 GitHub Issues 中提取[投稿-已收录]标签的内容，生成社区角页面。"""
from __future__ import annotations

import json
import os
import re
import sys
import textwrap
from pathlib import Path
from urllib.request import Request, urlopen


GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "Physics-Learning-Wiki/Physics-Learning-Wiki"


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
        info["type"] = type_match.group(1).strip()

    chapter_match = re.search(r"目标章节\*\*:\s*(.+?)(?:\n|$)", body)
    if chapter_match:
        info["chapter"] = chapter_match.group(1).strip()

    attr_match = re.search(r"署名\*\*:\s*(.+?)(?:\n|$)", body)
    if attr_match:
        info["attribution"] = attr_match.group(1).strip()

    return info


def generate_page(issue: dict, output_dir: Path) -> str:
    """为单个投稿生成 Markdown 页面。"""
    number = issue["number"]
    title = issue["title"].replace("[投稿]", "").strip()
    body = issue["body"] or ""
    info = parse_issue_body(body)
    created = issue["created_at"][:10]

    content = body
    separator_match = re.search(r"^---\s*$", body, re.MULTILINE)
    if separator_match:
        content = body[separator_match.end():].strip()

    frontmatter = textwrap.dedent(f"""\
    ---
    status: community
    author: {info['attribution']}
    source_issue: {issue['html_url']}
    submission_date: {created}
    title: {title}
    ---
    """)

    page = f"{frontmatter}\n\n# {title}\n\n{content}\n"

    output_file = output_dir / f"{number}.md"
    output_file.write_text(page, encoding="utf-8")
    return str(output_file)


def generate_index(issues: list[dict], output_dir: Path) -> None:
    """生成社区角首页。"""
    lines = [
        "# 社区角",
        "",
        "这里展示来自社区投稿的内容，未经团队深度审核，仅供交流参考。",
        "",
    ]

    if not issues:
        lines.append("*暂无社区投稿。快来[提交你的第一篇投稿](/submit/)吧！*")
    else:
        for issue in issues:
            number = issue["number"]
            title = issue["title"].replace("[投稿]", "").strip()
            info = parse_issue_body(issue["body"] or "")
            created = issue["created_at"][:10]

            lines.append(f"## [{title}]({number}.md)")
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
    print(f"  [OK] Community index: docs/community/index.md")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
