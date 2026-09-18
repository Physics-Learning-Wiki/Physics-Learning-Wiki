from pathlib import Path

from scripts.question_bank.models import PageContract
from scripts.question_bank.page_contracts import (
    build_page_registry,
    discover_page_contracts,
    validate_page_contracts,
)

ROOT = Path(__file__).parents[2]


def test_pilot_page_contracts_have_six_anchored_objectives_each() -> None:
    pages, issues = discover_page_contracts(ROOT)
    assert not [issue for issue in issues if issue.severity == "error"]
    assert len(pages["mechanics.kinematics.linear-motion"].objectives) == 6
    assert len(pages["mechanics.dynamics.newton-laws"].objectives) == 6


def test_build_page_registry_detects_conflicting_global_objectives() -> None:
    p1 = PageContract(
        path=ROOT / "doc1.md",
        page_id="page.one",
        title="P1",
        url="p1/",
        objectives={"obj.shared": {"id": "obj.shared", "title": "Shared", "anchor": "a"}},
        quiz={},
    )
    p2 = PageContract(
        path=ROOT / "doc2.md",
        page_id="page.two",
        title="P2",
        url="p2/",
        objectives={"obj.shared": {"id": "obj.shared", "title": "Shared", "anchor": "a"}},
        quiz={},
    )
    issues = validate_page_contracts({"page.one": p1, "page.two": p2})
    assert any("conflicts" in issue.message for issue in issues)
