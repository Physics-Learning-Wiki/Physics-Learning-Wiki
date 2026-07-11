from pathlib import Path

from scripts.question_bank.page_contracts import discover_page_contracts


ROOT = Path(__file__).parents[2]


def test_pilot_page_contracts_have_six_anchored_objectives_each() -> None:
    pages, issues = discover_page_contracts(ROOT)
    assert not [issue for issue in issues if issue.severity == "error"]
    assert len(pages["mechanics.kinematics.linear-motion"].objectives) == 6
    assert len(pages["mechanics.dynamics.newton-laws"].objectives) == 6
