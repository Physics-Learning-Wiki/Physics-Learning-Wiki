from collections import Counter
from pathlib import Path

import yaml


ROOT = Path(__file__).parents[2]
QUESTIONS = ROOT / "question-bank" / "questions" / "mechanics" / "dynamics" / "newton-laws"
PLAN = ROOT / "question-bank" / "release-plans" / "newton-laws-v1.yml"


def test_newton_v1_release_plan_has_exact_target_distribution() -> None:
    plan = yaml.safe_load(PLAN.read_text(encoding="utf-8"))
    questions = {
        question["id"]: question
        for path in QUESTIONS.glob("*.yml")
        for question in [yaml.safe_load(path.read_text(encoding="utf-8"))]
    }
    selected = [questions[question_id] for question_id in plan["selected"]]
    reserves = [questions[question_id] for question_id in plan["reserves"]]

    assert len(questions) == 30
    assert len(selected) == 24
    assert len(reserves) == 6
    assert set(plan["selected"]).isdisjoint(plan["reserves"])
    assert set(plan["selected"]) | set(plan["reserves"]) == set(questions)
    objective_counts = Counter(question["primary_objective"] for question in selected)
    assert len(objective_counts) == 6
    assert set(objective_counts.values()) == {4}
    assert Counter(question["type"] for question in selected) == {
        "single_choice": 8,
        "multiple_choice": 7,
        "true_false": 2,
        "numeric": 7,
    }
    assert Counter(question["difficulty"] for question in selected) == {1: 8, 2: 12, 3: 4}
    assert sum(question["style"] == "graphical" for question in selected) >= 1
