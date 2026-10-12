"""Human-operated batch recording of completed reviews; plan is read-only."""
from __future__ import annotations

import argparse
import json
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from .coverage import coverage_data
from .loader import load_json
from .maintenance import _write_yaml, attest
from .media import question_content_fingerprint
from .models import SourceDocument
from .utils import fingerprint
from .validator import validate_question_content, validate_question_references, validate_repository

DIMENSIONS = ("physics", "pedagogy", "copyright")


def _validated(root: Path):
    report = validate_repository(root, include_drafts=True)
    if not report.ok:
        raise ValueError("\n".join(issue.render() for issue in report.errors))
    return report


def _identity(reviewer: str, reviewed_on: str, dimensions: list[str]) -> None:
    if not isinstance(reviewer, str) or not re.fullmatch(r"[A-Za-z0-9-]{1,39}", reviewer):
        raise ValueError("reviewer must be a GitHub username (1–39 letters, digits or hyphens)")
    if not isinstance(reviewed_on, str) or date.fromisoformat(reviewed_on).isoformat() != reviewed_on:
        raise ValueError("reviewed_on must be an ISO date: YYYY-MM-DD")
    if not dimensions or len(set(dimensions)) != len(dimensions) or not set(dimensions) <= set(DIMENSIONS):
        raise ValueError("choose unique dimensions from physics, pedagogy, copyright")


def _check_publication_content(root: Path, documents: list[SourceDocument], report) -> None:
    """Check published content requirements before recording any signatures.

    Review requirements are checked by the final validator after the human's
    signatures are recorded. No signatures or source files are created here.
    """
    schema = load_json(root / "question-bank/schemas/question.schema.json")
    errors = []
    for document in documents:
        prospective = SourceDocument(document.path, {**document.data, "status": "published"})
        issues = validate_question_content(prospective, schema, root)
        issues.extend(validate_question_references(prospective, report.data.page_registry, report.data.taxonomy))
        errors.extend(issue for issue in issues
                      if issue.severity == "error"
                      and issue.field != "review" and not issue.field.startswith("review.")
                      and issue.message != "'review' is a required property")
    if errors:
        raise ValueError("Publication content preflight failed; no review marks written:\n"
                         + "\n".join(issue.render() for issue in errors))


def create_plan(
    root: Path, *, reviewer: str, reviewed_on: str, dimensions: list[str],
    all_drafts: bool = False, directory: str | None = None,
    set_ids: list[str] | None = None, ids: list[str] | None = None,
    id_range: str | None = None,
) -> dict[str, Any]:
    root = root.resolve()
    _identity(reviewer, reviewed_on, dimensions)
    if sum(bool(x) for x in (all_drafts, directory, set_ids, ids, id_range)) != 1:
        raise ValueError("choose exactly one question selector")
    report = _validated(root)
    questions = {doc.data["id"]: doc for doc in report.data.questions}
    sets = {doc.data["id"]: doc for doc in report.data.sets}
    if all_drafts:
        selected = set(questions)
    elif directory:
        folder = (root / directory).resolve()
        if not folder.is_relative_to(root / "question-bank/questions") or not folder.is_dir():
            raise ValueError("directory must exist inside question-bank/questions")
        selected = {qid for qid, doc in questions.items() if doc.path.resolve().is_relative_to(folder)}
    elif set_ids:
        selected = set()
        for sid in set_ids:
            if sid not in sets or sets[sid].data["status"] == "retired":
                raise ValueError(f"unknown or retired set: {sid}")
            selection = sets[sid].data["selection"]
            if selection["type"] != "fixed":
                raise ValueError(f"set {sid} uses query selection; choose a directory or explicit ids instead")
            selected.update(selection["questions"])
    elif id_range:
        match = re.fullmatch(r"q-(\d{6}):q-(\d{6})", id_range)
        if not match or int(match[1]) > int(match[2]):
            raise ValueError("id range must be q-000050:q-000089, in ascending order")
        selected = {f"q-{n:06d}" for n in range(int(match[1]), int(match[2]) + 1)}
    else:
        selected = set(ids or [])
    unknown = selected - set(questions)
    if unknown:
        raise ValueError(f"unknown question ids: {', '.join(sorted(unknown))}")
    selected = {qid for qid in selected if questions[qid].data["status"] == "draft"}
    if not selected:
        raise ValueError("no draft questions match the selector")
    eligible = selected | {qid for qid, doc in questions.items() if doc.data["status"] == "published"}
    related_sets = []
    for sid, doc in sorted(sets.items()):
        selection = doc.data["selection"]
        if doc.data["status"] != "draft" or selection["type"] != "fixed":
            continue
        required = set(selection["questions"])
        if required & selected and required <= eligible:
            related_sets.append(dict(id=sid, fingerprint=fingerprint(doc.data)))
    return dict(
        schema_version=1, repository=str(root), reviewer=reviewer,
        reviewed_on=reviewed_on, dimensions=dimensions,
        questions=[dict(id=qid, version=questions[qid].data["version"],
                        content_fingerprint=question_content_fingerprint(questions[qid].data, root),
                        path=questions[qid].path.relative_to(root).as_posix())
                   for qid in sorted(selected)],
        related_sets=related_sets,
    )


def apply_plan(
    root: Path, plan: dict[str, Any], *, confirm_human_review: bool = False,
    publish: bool = False, publish_sets: bool = False,
) -> list[Path]:
    """Called only by the human reviewer after checking the frozen plan."""
    if not confirm_human_review:
        raise ValueError("requires --confirm-human-review after the human review is complete")
    if publish_sets and not publish:
        raise ValueError("--publish-sets requires --publish")
    root = root.resolve()
    if plan.get("schema_version") != 1 or plan.get("repository") != str(root):
        raise ValueError("invalid plan version or repository mismatch")
    reviewer, reviewed_on, dimensions = (plan.get(k) for k in ("reviewer", "reviewed_on", "dimensions"))
    if not isinstance(dimensions, list):
        raise ValueError("invalid plan dimensions")
    _identity(reviewer, reviewed_on, dimensions)
    entries = plan.get("questions")
    set_entries = plan.get("related_sets", [])
    if not isinstance(entries, list) or not entries or not all(isinstance(x, dict) for x in entries):
        raise ValueError("plan must contain questions")
    if not isinstance(set_entries, list) or not all(isinstance(x, dict) for x in set_entries):
        raise ValueError("invalid related_sets")
    question_ids = [x.get("id") for x in entries]
    selected_set_ids = [x.get("id") for x in set_entries] if publish_sets else []
    for values in (question_ids, selected_set_ids):
        if not all(isinstance(x, str) for x in values) or len(values) != len(set(values)):
            raise ValueError("invalid or duplicate resource ids in plan")
    report = _validated(root)
    questions = {doc.data["id"]: doc for doc in report.data.questions}
    sets = {doc.data["id"]: doc for doc in report.data.sets}
    targets = []
    for entry in entries:
        doc = questions.get(entry["id"])
        if (doc is None or doc.data["status"] != "draft"
                or doc.data["version"] != entry.get("version")
                or question_content_fingerprint(doc.data, root) != entry.get("content_fingerprint")):
            raise ValueError(f"stale plan for {entry['id']}; generate and review a new plan")
        targets.append(doc)
    if publish_sets:
        for entry in set_entries:
            doc = sets.get(entry["id"])
            if doc is None or doc.data["status"] != "draft" or fingerprint(doc.data) != entry.get("fingerprint"):
                raise ValueError(f"stale set plan for {entry['id']}")
            targets.append(doc)
    if publish:
        _check_publication_content(root, targets[:len(entries)], report)
    original_bytes = {doc.path: doc.path.read_bytes() for doc in targets}
    try:
        for entry in entries:
            attest(root, entry["id"], dimensions, reviewer, reviewed_on)
        if publish:
            # Signatures use the existing attest implementation. Publish all in one
            # transaction so validation does not need to scan the repo per question.
            refreshed = _validated(root)
            for doc in refreshed.data.questions:
                if doc.data["id"] in question_ids:
                    doc.data["status"] = "published"
                    _write_yaml(doc.path, doc.data)
        for sid in selected_set_ids:
            doc = sets[sid]
            doc.data["status"] = "published"
            _write_yaml(doc.path, doc.data)
        result = _validated(root)
        if publish_sets:
            coverage = coverage_data(result)["sets"]
            for sid in selected_set_ids:
                if not coverage[sid]["feasible"]:
                    raise ValueError(f"set {sid} is not feasible")
    except BaseException:
        for path, content in original_bytes.items():
            path.write_bytes(content)
        raise
    return list(original_bytes)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="人工审核完成后的批量签署工具；plan 不修改题库。")
    commands = parser.add_subparsers(dest="command", required=True)
    plan_parser = commands.add_parser("plan", help="生成锁定题目版本与内容指纹的审核清单")
    selectors = plan_parser.add_mutually_exclusive_group(required=True)
    selectors.add_argument("--all-drafts", action="store_true", help="全部草稿，包含其他主题")
    selectors.add_argument("--directory", help="题目目录，相对仓库根目录")
    selectors.add_argument("--set", action="append", dest="set_ids", help="固定题集 ID，可重复")
    selectors.add_argument("--ids", nargs="+", help="一个或多个题目 ID")
    selectors.add_argument("--id-range", help="含两端的题号范围，例如 q-000050:q-000089")
    plan_parser.add_argument("--reviewer", required=True, help="实际审核者的 GitHub 用户名")
    plan_parser.add_argument("--reviewed-on", default=datetime.now(timezone(timedelta(hours=8))).date().isoformat())
    plan_parser.add_argument("--dimension", choices=DIMENSIONS, action="append", dest="dimensions")
    plan_parser.add_argument("--output", type=Path, required=True)
    apply_parser = commands.add_parser("apply", help="由审核者亲自执行，批量记录其已完成的审核")
    apply_parser.add_argument("--plan", type=Path, required=True)
    apply_parser.add_argument("--confirm-human-review", action="store_true", help="声明已人工审核清单中的精确版本和所列维度")
    apply_parser.add_argument("--publish", action="store_true", help="同时发布题目；仍须通过三维签署校验")
    apply_parser.add_argument("--publish-sets", action="store_true", help="同时发布清单列出的关联固定题集")
    args = parser.parse_args(argv)
    root = Path.cwd()
    try:
        if args.command == "plan":
            plan = create_plan(root, reviewer=args.reviewer, reviewed_on=args.reviewed_on,
                               dimensions=args.dimensions or list(DIMENSIONS), all_drafts=args.all_drafts,
                               directory=args.directory, set_ids=args.set_ids, ids=args.ids, id_range=args.id_range)
            output = args.output.resolve()
            if output.is_relative_to((root / "question-bank").resolve()) or output.exists():
                raise ValueError("plan output must be a new file outside question-bank")
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"Reviewer: {plan['reviewer']}; date: {plan['reviewed_on']}; dimensions: {', '.join(plan['dimensions'])}")
            for entry in plan["questions"]:
                print(f"  {entry['id']} v{entry['version']}  {entry['path']}")
            print(f"Plan: {output}; {len(plan['questions'])} draft question(s), {len(plan['related_sets'])} related set(s). No review marks written.")
            for entry in plan["related_sets"]:
                print(f"  Related set: {entry['id']}")
        else:
            plan = json.loads(args.plan.read_text(encoding="utf-8"))
            if not isinstance(plan, dict):
                raise ValueError("plan must be a JSON object")
            changed = apply_plan(root, plan, confirm_human_review=args.confirm_human_review,
                                 publish=args.publish, publish_sets=args.publish_sets)
            print(f"Recorded human review; updated {len(changed)} resource(s). Questions published: {args.publish}; sets published: {args.publish_sets}.")
    except (ValueError, OSError, TypeError) as exc:
        print(f"ERROR: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
