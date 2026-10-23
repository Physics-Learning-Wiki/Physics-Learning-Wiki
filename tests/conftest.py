import shutil
import sys
from pathlib import Path

import pytest
import yaml


ROOT = Path(__file__).parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.question_bank.batch_review import DIMENSIONS, apply_plan, create_plan
from scripts.question_bank.validator import validate_repository


def pytest_addoption(parser: pytest.Parser) -> None:
    parser.addoption(
        "--built-site-dir",
        help="Read an existing production site; run corepack yarn site:build first.",
    )


@pytest.fixture
def submission_repository(tmp_path: Path) -> Path:
    """Exercise real imports without loading or writing the repository's questions."""
    root = tmp_path / "submission-repo"
    for directory in ("schemas", "taxonomy"):
        shutil.copytree(ROOT / "question-bank" / directory, root / "question-bank" / directory)
    for directory in ("questions", "sets"):
        (root / "question-bank" / directory).mkdir()
    docs = root / "docs"
    docs.mkdir()
    metadata = {
        "page_id": "mechanics.dynamics.newton-laws",
        "learning_objectives": [{
            "id": "mechanics.newton.first-law",
            "title": "Newton's first law",
            "anchor": "newton-first-law",
        }],
    }
    (docs / "newton-laws.md").write_text(
        "---\n" + yaml.safe_dump(metadata) + '---\n<span id="newton-first-law"></span>\n',
        encoding="utf-8",
    )
    return root


@pytest.fixture
def question_bank_repository(tmp_path: Path) -> Path:
    """Synthetic repository only: no attestation is written to real questions."""
    root = tmp_path / "repo"
    schemas = root / "question-bank/schemas"
    schemas.mkdir(parents=True)
    for filename in ("question.schema.json", "set.schema.json"):
        shutil.copyfile(ROOT / "question-bank/schemas" / filename, schemas / filename)
    taxonomy = root / "question-bank/taxonomy"
    (taxonomy / "concepts").mkdir(parents=True)
    (taxonomy / "topics.yml").write_text("test.topic:\n  title: Test\n", encoding="utf-8")
    (taxonomy / "concepts/test.yml").write_text("test.concept:\n  title: Test\n  topics: [test.topic]\n", encoding="utf-8")
    original = yaml.safe_load((ROOT / "question-bank/fixtures/valid/true-false.yml").read_text(encoding="utf-8"))
    free_response = yaml.safe_load((ROOT / "question-bank/fixtures/valid/free-response.yml").read_text(encoding="utf-8"))
    free_response["feedback"] = dict(original["feedback"])
    for number in range(1, 4):
        source = free_response if number == 2 else original
        question = {**source, "id": f"q-{number:06d}", "status": "draft",
                    "topics": ["test.topic"], "concepts": ["test.concept"],
                    "stem": f"Synthetic question {number}: " + source["stem"],
                    "difficulty": 1, "cognitive_level": "understand", "style": "conceptual",
                    "estimated_seconds": 30}
        question.pop("review", None)
        question.pop("related_pages", None)
        question.pop("objectives", None)
        folder = "selected" if number <= 2 else "other"
        path = root / f"question-bank/questions/{folder}/q-{number:06d}.yml"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.safe_dump(question, allow_unicode=True), encoding="utf-8")
    for name, ids in [("selected", ["q-000001", "q-000002"]), ("other", ["q-000003"])]:
        path = root / f"question-bank/sets/{name}.yml"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.safe_dump(dict(schema_version=1, id=f"test.{name}", title=name,
                                           status="draft", feedback_mode="immediate",
                                           selection=dict(type="fixed", questions=ids, order="fixed"))), encoding="utf-8")
    assert validate_repository(root).ok
    return root


@pytest.fixture
def mixed_question_bank(question_bank_repository: Path) -> Path:
    """One published question/set alongside independent drafts."""
    root = question_bank_repository
    frozen = create_plan(root, reviewer="test-reviewer", reviewed_on="2026-10-12",
                         dimensions=list(DIMENSIONS), ids=["q-000003"])
    apply_plan(root, frozen, confirm_human_review=True, publish=True, publish_sets=True)
    return root
