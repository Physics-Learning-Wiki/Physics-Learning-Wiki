"""Read versioned, bot-authored records without trusting prose or branch names."""
from __future__ import annotations

import hashlib
import json
import re

REPO = "Physics-Learning-Wiki/Physics-Learning-Wiki"
FENCE = chr(96) * 3
STAGES = ("received", "needs_info", "accepted", "importing", "draft_ready", "reviewing",
          "published", "rejected", "withdrawn", "resolved")
PREFIX = "投稿状态:"


def digest(value: object) -> str:
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                    separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def block(kind: str, value: dict) -> str:
    return FENCE + "json " + kind + "\n" + json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n" + FENCE


def blocks(body: str, kind: str) -> list[dict]:
    pattern = re.compile(r"^" + FENCE + "json " + re.escape(kind) + r"\s*\n([^\n]+)\n" + FENCE + r"\s*$", re.M)
    result = []
    for match in pattern.finditer(body or ""):
        value = json.loads(match[1])
        if not isinstance(value, dict):
            raise ValueError("Machine record must be an object")
        result.append(value)
    return result


def latest_revision(issue: dict, comments: list[dict]) -> dict:
    records = blocks(issue.get("body") or "", "plw-submission-v1")
    if records:
        if len(records) != 1:
            raise ValueError("Ambiguous initial submission record")
        initial = records[0]
        if initial.get("revision") != 1:
            raise ValueError("Initial revision must be 1")
        current = initial
        for comment in sorted(comments, key=lambda c: c["id"]):
            if comment.get("user", {}).get("id") != issue.get("user", {}).get("id"):
                continue
            for candidate in blocks(comment.get("body") or "", "plw-submission-v1"):
                if (candidate.get("submissionId") != initial.get("submissionId")
                        or candidate.get("type") != initial.get("type")):
                    raise ValueError("Revision source mismatch")
                if candidate.get("revision") == current["revision"] + 1:
                    current = candidate
                elif candidate.get("revision") != current["revision"]:
                    raise ValueError("Non-contiguous submission revisions")
                elif candidate != current:
                    raise ValueError("Conflicting submission revisions")
        return current
    legacy = blocks(issue.get("body") or "", "plw-question-submission-v2")
    if len(legacy) != 1:
        raise ValueError("Issue requires exactly one supported submission record")
    return {"schemaVersion": 1, "type": "question", "revision": 1,
            "payload": {"question": legacy[0]["question"]},
            "licenseConsent": legacy[0].get("licenseConsent"),
            "licenseVersion": legacy[0].get("licenseVersion")}


def question_payload(issue: dict, revision: dict) -> dict:
    if revision.get("type") != "question":
        raise ValueError("Not a question submission")
    return {"schemaVersion": 2, "issueUrl": f"https://github.com/{REPO}/issues/{issue['number']}",
            "question": revision["payload"]["question"], "revision": revision["revision"],
            **{key: revision[key] for key in ("submissionId", "licenseConsent", "licenseVersion", "sourceDeclaration")
               if key in revision}}


def metadata(body: str) -> dict | None:
    match = re.search(r"<!-- plw-question-pr:(\{[^\n]+\}) -->", body or "")
    return json.loads(match[1]) if match else None


def select_pr(prs: list[dict], issue_number: int, repo: str = REPO) -> dict | None:
    matches = []
    for pr in prs:
        if pr.get("head", {}).get("repo", {}).get("full_name") != repo:
            continue
        record = metadata(pr.get("body", ""))
        legacy = pr.get("head", {}).get("ref") == f"question-submission/issue-{issue_number}"
        if (record and record.get("issue") == issue_number and record.get("repo") == repo) or legacy:
            matches.append(pr)
    opened = [pr for pr in matches if pr.get("state", "").lower() == "open"]
    if len(opened) > 1:
        raise ValueError("Multiple open question PRs require maintainer coordination")
    return opened[0] if opened else None


def three_way(base, current, incoming, path=""):
    """Merge disjoint object changes; arrays and scalar values remain atomic."""
    if current == base:
        return incoming
    if incoming == base or current == incoming:
        return current
    if all(isinstance(value, dict) for value in (base, current, incoming)):
        result = {}
        missing = object()
        for key in base.keys() | current.keys() | incoming.keys():
            value = three_way(base.get(key, missing), current.get(key, missing),
                              incoming.get(key, missing), path + "/" + key)
            if value is not missing:
                result[key] = value
        return result
    raise ValueError("Revision conflicts with maintainer edits at " + (path or "/"))
