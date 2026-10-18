"""Count published submissions from the served release and review changes in the community PR."""
from collections import Counter
import hashlib
import html
import json
from pathlib import Path
import subprocess

from scripts.submissions.github import GitHub
from scripts.submissions.release import RELEASE_PATH, SITE_URL, fetch_bytes, verify_release
from .generator import SnapshotConflict, _atomic_write, merge_markdown, sanitize_plain_metadata

PAGE = Path("docs/intro/contributors.md")
STATE = Path("data/contributors-generated.json")


def git_contributors(root):
    result = subprocess.run(["git", "log", "origin/main", "--format=%an"], cwd=root,
                            check=True, capture_output=True, text=True, encoding="utf-8")
    return Counter(name.strip() for name in result.stdout.splitlines() if name.strip()
                   and not any(bot in name.lower() for bot in ("github-actions", "dependabot", "[bot]")))


def issue_contributors(issues, release):
    available = {str(issue["number"]) for issue in issues if "pull_request" not in issue}
    counts = Counter()
    for number, entry in release["entries"].items():
        if number not in available or entry.get("stage") != "published":
            continue
        name = sanitize_plain_metadata(str(entry.get("author", "匿名")), 60)
        if name and name not in {"匿名", "匿名同学", "匿名投稿者"} and not name.endswith("[bot]"):
            counts[name] += 1
    return counts


def page_source(commits, submissions):
    lines = ["---", "title: 贡献者墙", "---", "", "感谢每一位参与 Physics Learning Wiki 的朋友！", "",
             "Git 提交按主分支历史统计，投稿贡献按已核验的线上发布清单统计．匿名稿件不公开个人统计．", "",
             "## GitHub 贡献者", "", "<table><thead><tr><th>贡献者</th><th>提交次数</th></tr></thead><tbody>"]
    lines += [f"<tr><td>{html.escape(sanitize_plain_metadata(name))}</td><td>{count}</td></tr>"
              for name, count in commits.most_common(50)]
    lines += ["</tbody></table>", "", "## 投稿贡献者", ""]
    if submissions:
        lines += ["<table><thead><tr><th>署名</th><th>已发布稿件</th></tr></thead><tbody>"]
        lines += [f"<tr><td>{html.escape(name)}</td><td>{count}</td></tr>"
                  for name, count in sorted(submissions.items(), key=lambda entry: (-entry[1], entry[0]))]
        lines += ["</tbody></table>"]
    else:
        lines += ["当前线上清单没有可公开署名的投稿记录．"]
    lines += ["", "此页由自动化生成，更新需经人工审核 PR 合并后展示．", ""]
    return "\n".join(lines)


def generate_contributors(root, *, issues=None, release=None):
    if release is None:
        served = json.loads(fetch_bytes(SITE_URL + RELEASE_PATH))
        release = verify_release(served["sourceSha"])
    if issues is None:
        issues = GitHub().pages("issues?state=all&per_page=100")
    incoming = page_source(git_contributors(root), issue_contributors(issues, release))
    path, state_path = root / PAGE, root / STATE
    if path.is_symlink() or state_path.is_symlink():
        raise SnapshotConflict("Contributor managed paths must not be symlinks")
    current = path.read_text(encoding="utf-8") if path.exists() else ""
    if not state_path.exists() and current:
        raise SnapshotConflict("Contributor page requires explicit adoption into its managed manifest")
    previous = json.loads(state_path.read_text(encoding="utf-8")) if state_path.exists() else {"generated": "", "sha256": hashlib.sha256(b"").hexdigest()}
    if not isinstance(previous.get("generated"), str) or not isinstance(previous.get("sha256"), str):
        raise SnapshotConflict("Invalid contributor manifest")
    merged = merge_markdown(previous["generated"], current, incoming)
    state = {"version": 1, "sha256": hashlib.sha256(merged.encode()).hexdigest(), "generated": incoming}
    encoded = json.dumps(state, ensure_ascii=False, indent=2) + "\n"
    changed = current != merged or not state_path.exists() or state_path.read_text(encoding="utf-8") != encoded
    if current != merged:
        _atomic_write(path, merged.encode())
    if not state_path.exists() or state_path.read_text(encoding="utf-8") != encoded:
        _atomic_write(state_path, encoded.encode())
    return changed
