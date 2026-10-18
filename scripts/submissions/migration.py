"""Read-only inventory: never renumber merged content or republish closed history."""
from __future__ import annotations
import json
from pathlib import Path
from .github import GitHub
from .records import metadata


def inventory(api):
    prs = api.pages("pulls?state=open&base=main&per_page=100")
    issues = api.pages("issues?labels=投稿-已收录&state=all&per_page=100")
    return {
        "legacyQuestionPRs": [{"number": pr["number"], "url": pr["html_url"],
                               "action": "review and migrate to Issue-derived ID before automatic revision"}
                              for pr in prs if pr["head"]["ref"].startswith("question-submission/")
                              and not metadata(pr.get("body", ""))],
        "closedCommunityIssues": [{"number": issue["number"], "url": issue["html_url"],
                                    "action": "explicit maintainer decision required; do not republish automatically"}
                                   for issue in issues if issue.get("state") == "closed" and "pull_request" not in issue],
    }


if __name__ == "__main__":
    print(json.dumps(inventory(GitHub()), ensure_ascii=False, indent=2))
