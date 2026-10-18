"""Read-only inventory: never renumber merged content or republish closed history."""
from __future__ import annotations
import json
from pathlib import Path
import yaml
from .github import GitHub
from .records import metadata


def inventory(api, root=None):
    prs = api.pages("pulls?state=open&base=main&per_page=100")
    issues = api.pages("issues?labels=投稿-已收录&state=all&per_page=100")
    managed = []
    if root:
        for path in (root / "question-bank/questions").rglob("*.yml"):
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
            if data.get("submission", {}).get("issue_url"):
                managed.append({"id": data["id"], "path": path.relative_to(root).as_posix(),
                                "source": data["submission"]["issue_url"], "action": "keep existing imported ID"})
    pending = {}
    for pr in prs:
        info = metadata(pr.get("body", ""))
        if info and info.get("question"):
            pending.setdefault(info["question"], []).append(pr["number"])
    return {
        "legacyQuestionPRs": [{"number": pr["number"], "url": pr["html_url"],
                               "action": "review and migrate to Issue-derived ID before automatic revision"}
                              for pr in prs if pr["head"]["ref"].startswith("question-submission/")
                              and not metadata(pr.get("body", ""))],
        "closedCommunityIssues": [{"number": issue["number"], "url": issue["html_url"],
                                    "action": "explicit maintainer decision required; do not republish automatically"}
                                   for issue in issues if issue.get("state") == "closed" and "pull_request" not in issue],
        "importedQuestions": managed,
        "pendingIdConflicts": [{"id": identifier, "prs": numbers, "action": "reimport unmerged submissions using their Issue IDs"}
                               for identifier, numbers in pending.items() if len(numbers) > 1],
    }


if __name__ == "__main__":
    print(json.dumps(inventory(GitHub(), Path.cwd()), ensure_ascii=False, indent=2))
