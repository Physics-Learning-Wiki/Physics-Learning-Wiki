from pathlib import Path

from scripts.question_bank.coverage import coverage_data
from scripts.question_bank.validator import validate_repository


ROOT = Path(__file__).parents[2]


def test_empty_published_bank_reports_construction() -> None:
    data = coverage_data(validate_repository(ROOT))
    assert all(page["status"] == "construction" for page in data.values())
    assert all(page["published"] == 0 for page in data.values())
