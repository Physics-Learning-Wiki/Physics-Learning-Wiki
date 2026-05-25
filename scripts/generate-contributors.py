# scripts/generate-contributors.py
"""从 git 历史 + Issue 投稿记录 生成贡献者墙页面。"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen


GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "Physics-Learning-Wiki/Physics-Learning-Wiki"


def get_git_contributors() -> Counter:
    """从 git 历史统计贡献者。"""
    result = subprocess.run(
        ["git", "log", "--all", "--format=%an"],
        capture_output=True,
        text=True,
    )
    counter: Counter = Counter()
    for name in result.stdout.strip().split("\n"):
        name = name.strip()
        if name and "github-actions" not in name and "dependabot" not in name:
            counter[name] += 1
    return counter


def get_issue_contributors() -> list[dict]:
    """从已收录的投稿 Issues 中提取贡献者署名。"""
    url = f"https://api.github.com/repos/{REPO}/issues"
    params = "?labels=投稿-已收录&state=all&per_page=100"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "User-Agent": "Physics-Learning-Wiki-Bot",
    }
    try:
        req = Request(url + params, headers=headers)
        with urlopen(req) as resp:
            issues = json.loads(resp.read().decode())
    except Exception:
        return []

    contributors: list[dict] = []
    seen = set()
    for issue in issues:
        body = issue["body"] or ""
        match = re.search(r"署名\*\*:\s*(.+?)(?:\n|$)", body)
        name = match.group(1).strip() if match else "匿名"
        if name not in seen and name != "匿名":
            seen.add(name)
            contributors.append({
                "name": name,
                "submissions": 1,
                "issue_url": issue["html_url"],
            })
    return contributors


def generate_page(git_counter: Counter, issue_contributors: list[dict]) -> str:
    """生成贡献者墙 Markdown 页面。"""
    now = datetime.utcnow().strftime("%Y-%m-%d")
    lines = [
        "# 贡献者墙",
        "",
        f"> 最后更新：{now}",
        "",
        "感谢每一位为 Physics Learning Wiki 做出贡献的朋友！",
        "",
        "## GitHub 贡献者",
        "",
        "| 贡献者 | 提交次数 |",
        "|--------|---------|",
    ]

    for name, count in git_counter.most_common(50):
        lines.append(f"| {name} | {count} |")

    if issue_contributors:
        lines.append("")
        lines.append("## 投稿贡献者")
        lines.append("")
        lines.append("| 贡献者 | 投稿链接 |")
        lines.append("|--------|---------|")
        for c in issue_contributors:
            lines.append(f"| {c['name']} | [查看]({c['issue_url']}) |")

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("*此页面由 GitHub Actions 每月自动更新。*")
    return "\n".join(lines)


def main() -> int:
    git_counter = get_git_contributors()
    issue_contributors = get_issue_contributors()

    page = generate_page(git_counter, issue_contributors)

    output = Path("docs/intro/contributors.md")
    output.write_text(page, encoding="utf-8")
    print(f"[OK] Contributors page written to {output}")
    print(f"   Git contributors: {len(git_counter)}")
    print(f"   Issue contributors: {len(issue_contributors)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
