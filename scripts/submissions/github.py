from __future__ import annotations

import json
import subprocess
from urllib.parse import quote

from .records import PREFIX, REPO, STAGES, block, blocks, latest_revision


class GitHub:
    def __init__(self, repo=REPO):
        if repo != REPO:
            raise ValueError("Automation is restricted to the configured repository")
        self.repo = repo

    def api(self, path, *, method="GET", body=None):
        args = ["gh", "api", "--method", method, f"repos/{self.repo}/" + quote(path, safe="/?=&%")]
        if body is not None:
            args += ["--input", "-"]
        result = subprocess.run(args, input=json.dumps(body) if body is not None else None,
                                capture_output=True, text=True, encoding="utf-8")
        if result.returncode:
            raise RuntimeError(f"GitHub {method} {path.split('?')[0]} failed ({result.returncode})")
        return json.loads(result.stdout) if result.stdout.strip() else None

    def pages(self, path):
        args = ["gh", "api", "--paginate", "--slurp", f"repos/{self.repo}/" + quote(path, safe="/?=&%")]
        result = subprocess.run(args, check=True, capture_output=True, text=True, encoding="utf-8")
        pages = json.loads(result.stdout)
        if not isinstance(pages, list) or any(not isinstance(page, list) for page in pages):
            raise ValueError("Invalid paginated response")
        return [item for page in pages for item in page]

    def stage(self, number, stage, revision, *, note="", update_labels=True, **details):
        if stage not in STAGES:
            raise ValueError("Unknown submission stage")
        issue = self.api(f"issues/{number}")
        comments = self.pages(f"issues/{number}/comments?per_page=100")
        try:
            if latest_revision(issue, comments)["revision"] > revision:
                update_labels = False
        except ValueError:
            pass  # Legacy community articles have no claimable credential record.
        states = [record for comment in comments
                  if (comment.get("performed_via_github_app") or {}).get("slug") == "github-actions"
                  for record in blocks(comment.get("body") or "", "plw-submission-status-v1")
                  if record.get("revision") == revision]
        if stage == "received" and any(record.get("stage") != "received" for record in states):
            return  # Opening/triage events must not undo an acceptance or import.
        deployed = next((record for record in reversed(states) if record.get("sourceSha")), {})
        if (stage in {"accepted", "importing", "draft_ready", "reviewing"} and not details.get("sourceSha")
                and deployed.get("stage") in {"published", "withdrawn"}):
            if not details.get("resources"):
                return  # Late import/retry events cannot undo confirmed deployment evidence.
            # Independent question progress may change after the primary set is retired.
            stage = deployed["stage"]
        labels = [label["name"] for label in issue["labels"] if not label["name"].startswith(PREFIX)]
        target = PREFIX + stage
        try:
            self.api("labels", method="POST", body={"name": target, "color": "597da3"})
        except RuntimeError:
            # Independently confirm existence; permission and network failures remain fatal.
            from urllib.parse import quote
            self.api("labels/" + quote(target, safe=""))
        if target not in labels:
            labels.append(target)
        record = {"stage": stage, "revision": revision, **details}
        marker = block("plw-submission-status-v1", record)
        if not states or states[-1] != record:
            self.api(f"issues/{number}/comments", method="POST",
                     body={"body": note + "\n\n" + marker})
        if update_labels and {label["name"] for label in issue["labels"]} != set(labels):
            self.api(f"issues/{number}", method="PATCH", body={"labels": labels})
