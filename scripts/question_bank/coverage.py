from __future__ import annotations

from collections import Counter
from typing import Any

from .validator import ValidationReport, publication_readiness


def coverage_data(report: ValidationReport, *, preview: bool = False) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for page_id, page in sorted(report.data.pages.items()):
        if not page.quiz.get("enabled"):
            continue
        questions = [item.data for item in report.data.questions if page_id in item.data.get("scope", {}).get("pages", [])]
        published = [item for item in questions if item.get("status") == "published"]
        included = [item for item in questions if item.get("status") == "draft"] + published if preview else published
        objective_counts = Counter(item.get("primary_objective") for item in included)
        blueprint = next((item.data for item in report.data.blueprints if item.data.get("id") == page.quiz.get("blueprint")), {})
        ready, _ = publication_readiness(page, published, blueprint)
        result[page_id] = {
            "status": "available" if ready else "construction",
            "published": len(published),
            "draft": sum(item.get("status") == "draft" for item in questions),
            "retired": sum(item.get("status") == "retired" for item in questions),
            "types": dict(sorted(Counter(item.get("type") for item in included).items())),
            "objectives": {objective: objective_counts[objective] for objective in page.objectives},
        }
    return result


def render_coverage(report: ValidationReport, *, preview: bool = False) -> str:
    lines: list[str] = []
    for page_id, data in coverage_data(report, preview=preview).items():
        lines.append(page_id)
        lines.append(f"  status: {data['status']}")
        lines.append(f"  published: {data['published']}; draft: {data['draft']}; retired: {data['retired']}")
        lines.append("  types: " + ", ".join(f"{key}={value}" for key, value in data["types"].items()))
        lines.extend(f"  {objective}: {count}" for objective, count in data["objectives"].items())
    return "\n".join(lines) + ("\n" if lines else "")
