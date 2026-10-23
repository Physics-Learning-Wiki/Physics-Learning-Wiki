from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import yaml


ROOT = Path(__file__).parents[2]


def build_site(project_root: Path, tmp_path: Path, *, preview: bool = False) -> Path:
    """Build only the small synthetic project supplied by the test."""
    destination = tmp_path / ("preview-site" if preview else "production-site")
    environment = os.environ.copy()
    environment.pop("PLW_QUIZ_PREVIEW", None)
    if preview:
        environment["PLW_QUIZ_PREVIEW"] = "1"
        environment.pop("GITHUB_ACTIONS", None)
    subprocess.run(
        [sys.executable, "-m", "mkdocs", "build", "--clean", "--site-dir", str(destination)],
        cwd=project_root,
        env=environment,
        check=True,
        capture_output=True,
        text=True,
    )
    return destination


def test_build_filters_drafts_by_mode(mixed_question_bank: Path, tmp_path: Path) -> None:
    # The hook derives the bank root from mkdocs.yml, so build a temporary
    # project rather than writing generated preview files into the workspace.
    root = mixed_question_bank
    docs = root / "docs"
    docs.mkdir()
    (docs / "index.md").write_text("# Synthetic question bank\n", encoding="utf-8")
    (root / "mkdocs.yml").write_text(yaml.safe_dump({
        "site_name": "Question bank integration fixture",
        "hooks": [(ROOT / "hooks/question_bank.py").as_posix()],
    }), encoding="utf-8")
    for preview in (False, True):
        site = build_site(root, tmp_path, preview=preview)
        bank = site / "_generated" / "question-bank"
        manifest = json.loads((bank / "manifest.json").read_text(encoding="utf-8"))
        assert manifest["schemaVersion"] == 3
        assert manifest["preview"] is preview
        expected_ids = {"q-000001", "q-000002", "q-000003"} if preview else {"q-000003"}
        questions = json.loads((bank / manifest["catalogs"]["questions"]).read_text(encoding="utf-8"))
        assert {q["id"] for q in questions} == expected_ids
        expected_sets = {"test.selected", "test.other"} if preview else {"test.other"}
        assert set(manifest["sets"]) == expected_sets
        sets = json.loads((bank / manifest["catalogs"]["sets"]).read_text(encoding="utf-8"))
        assert {s["id"] for s in sets} == expected_sets
        for set_id, entry in manifest["sets"].items():
            bundle = json.loads((bank / entry["bundle"]).read_text(encoding="utf-8"))
            expected_questions = {"q-000001", "q-000002"} if set_id == "test.selected" else {"q-000003"}
            assert {q["id"] for q in bundle["questions"]} == expected_questions
