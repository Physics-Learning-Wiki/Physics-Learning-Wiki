from pathlib import Path

import pytest

from scripts.question_bank.compiler import compile_repository


@pytest.fixture(scope="session")
def compiled_question_bank(tmp_path_factory: pytest.TempPathFactory):
    """One read-only compile for structural assertions, never for mutation tests."""
    output = tmp_path_factory.mktemp("compiled-question-bank") / "bank"
    report, metrics = compile_repository(Path(__file__).parents[2], output)
    assert report.ok, "\n".join(issue.render() for issue in report.errors)
    return output, report, metrics
