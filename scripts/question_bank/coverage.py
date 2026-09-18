from __future__ import annotations

from collections import Counter
from typing import Any

from .validator import ValidationReport


def coverage_data(report: ValidationReport, *, preview: bool = False) -> dict[str, Any]:
    questions = [item.data for item in report.data.questions]
    published = [q for q in questions if q.get("status") == "published"]
    draft = [q for q in questions if q.get("status") == "draft"]
    retired = [q for q in questions if q.get("status") == "retired"]

    included = questions if preview else published

    topic_counts = Counter(t for q in included for t in q.get("topics", []))
    concept_counts = Counter(c for q in included for c in q.get("concepts", []))
    type_counts = Counter(q.get("type") for q in included)
    difficulty_counts = Counter(q.get("difficulty") for q in included)
    style_counts = Counter(q.get("style") for q in included)

    sets_summary = {}
    for s in report.data.sets:
        sdata = s.data
        sid = sdata.get("id")
        sets_summary[sid] = {
            "title": sdata.get("title"),
            "status": sdata.get("status"),
            "selection_type": sdata.get("selection", {}).get("type"),
        }

    return {
        "summary": {
            "published": len(published),
            "draft": len(draft),
            "retired": len(retired),
            "total": len(questions),
        },
        "topics": dict(sorted(topic_counts.items())),
        "types": dict(sorted(type_counts.items())),
        "difficulties": dict(sorted(difficulty_counts.items())),
        "styles": dict(sorted(style_counts.items())),
        "concepts": dict(sorted(concept_counts.items())),
        "sets": sets_summary,
    }


def render_coverage(report: ValidationReport, *, preview: bool = False) -> str:
    data = coverage_data(report, preview=preview)
    lines: list[str] = []
    lines.append("题库资源概况:")
    lines.append(
        f"  已发布: {data['summary']['published']}; 草稿: {data['summary']['draft']}; 归档: {data['summary']['retired']}"
    )
    lines.append("题型分布: " + ", ".join(f"{k}={v}" for k, v in data["types"].items()))
    lines.append("难度分布: " + ", ".join(f"{k}={v}" for k, v in data["difficulties"].items()))
    lines.append("风格分布: " + ", ".join(f"{k}={v}" for k, v in data["styles"].items()))
    lines.append("分类主题:")
    for top, cnt in data["topics"].items():
        lines.append(f"  {top}: {cnt}")
    lines.append(f"测试集合 ({len(data['sets'])}):")
    for sid, sinfo in data["sets"].items():
        lines.append(f"  {sid} [{sinfo['status']}]: {sinfo['title']}")
    return "\n".join(lines) + "\n"
