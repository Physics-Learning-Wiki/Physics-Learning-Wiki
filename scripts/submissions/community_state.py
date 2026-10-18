"""Record an in-flight community PR without downgrading an already published version."""
from pathlib import Path
import re
import frontmatter

from .github import GitHub
from .records import blocks


def record_pr(root, api=None):
    api = api or GitHub()
    prs = [pr for pr in api.pages("pulls?state=open&base=main&per_page=100")
           if pr["head"]["ref"].startswith("bot/community-submissions")
           and (pr["head"].get("repo") or {}).get("full_name") == api.repo]
    if len(prs) != 1:
        return
    for path in (root / "docs/community").glob("*.md"):
        page = frontmatter.loads(path.read_text(encoding="utf-8"))
        match = re.fullmatch(r"https://github.com/" + re.escape(api.repo) + r"/issues/([1-9]\d*)", page.get("source_issue", ""))
        if not match:
            continue
        revision, number = page.get("submission_revision", 1), int(match[1])
        comments = api.pages(f"issues/{number}/comments?per_page=100")
        deployed = [record for comment in comments
                    if (comment.get("performed_via_github_app") or {}).get("slug") == "github-actions"
                    for record in blocks(comment.get("body") or "", "plw-submission-status-v1")
                    if record.get("stage") == "published" and record.get("revision") == revision]
        if not deployed:
            api.stage(number, "importing", revision, pr=prs[0]["html_url"], waitingFor="maintainer",
                      note="已同步社区稿件审核 PR：" + prs[0]["html_url"])


if __name__ == "__main__":
    record_pr(Path.cwd())
