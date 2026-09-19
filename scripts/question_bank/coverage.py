from __future__ import annotations

from collections import Counter
from typing import Any

from .selection import solve_query_selection
from .validator import ValidationReport


def coverage_data(report: ValidationReport, *, preview: bool = False) -> dict[str, Any]:
    questions = [item.data for item in report.data.questions]
    published = [q for q in questions if q.get("status") == "published"]
    draft = [q for q in questions if q.get("status") == "draft"]
    retired = [q for q in questions if q.get("status") == "retired"]

    included = questions if preview else published

    topic_counts = Counter(t for q in included for t in q.get("topics", []))
    concept_counts = Counter(c for q in included for c in q.get("concepts", []))
    type_counts = Counter(q.get("type") for q in included if q.get("type"))
    difficulty_counts = Counter(q.get("difficulty") for q in included if q.get("difficulty") is not None)
    cognitive_counts = Counter(q.get("cognitive_level") for q in included if q.get("cognitive_level"))
    style_counts = Counter(q.get("style") for q in included if q.get("style"))

    # Unregistered taxonomy in draft questions
    known_topics = set(report.data.taxonomy.topics.keys())
    known_concepts = set(report.data.taxonomy.concepts.keys())
    unregistered_topics = sorted({t for q in draft for t in q.get("topics", []) if t not in known_topics})
    unregistered_concepts = sorted({c for q in draft for c in q.get("concepts", []) if c not in known_concepts})

    # Set feasibility summary
    sets_summary = {}
    for s in report.data.sets:
        sdata = s.data
        sid = sdata.get("id")
        status = sdata.get("status")
        sel = sdata.get("selection", {})
        stype = sel.get("type")
        feasible = False
        reason = None
        # Published sets must strictly use published questions only
        set_pool = published if status == "published" else (questions if preview else published)
        if status == "retired":
            reason = "已退役"
        elif stype == "fixed":
            req_ids = sel.get("questions", [])
            existing_ids = {q.get("id") for q in set_pool}
            missing = [qid for qid in req_ids if qid not in existing_ids]
            if missing:
                reason = f"缺少题目: {', '.join(missing)}"
            else:
                feasible = True
        elif stype == "query":
            solution = solve_query_selection(set_pool, sel, report.data.taxonomy, set_id=str(sid))
            if solution is not None:
                feasible = True
            else:
                reason = "题目池不满足筛选槽或约束"

        sets_summary[sid] = {
            "title": sdata.get("title"),
            "status": status,
            "selection_type": stype,
            "feasible": feasible,
            "reason": reason,
        }

    # Health diagnostic warnings
    health_warnings: list[str] = []
    for tid, topic in report.data.taxonomy.topics.items():
        if topic_counts[tid] == 0:
            health_warnings.append(f"主题「{topic.title}」({tid}) 暂无{'（或暂未发布）' if not preview else ''}题目覆盖")

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
        "cognitive_levels": dict(sorted(cognitive_counts.items())),
        "styles": dict(sorted(style_counts.items())),
        "concepts": dict(sorted(concept_counts.items())),
        "unregistered_taxonomy": {
            "topics": unregistered_topics,
            "concepts": unregistered_concepts,
        },
        "sets": sets_summary,
        "health_warnings": health_warnings,
    }


def render_coverage(report: ValidationReport, *, preview: bool = False) -> str:
    data = coverage_data(report, preview=preview)
    lines: list[str] = []
    lines.append("=== 题库资源概况 ===")
    lines.append(
        f"总题目数: {data['summary']['total']} (已发布: {data['summary']['published']}, 草稿: {data['summary']['draft']}, 归档: {data['summary']['retired']})"
    )
    lines.append("")
    lines.append("--- 题型分布 ---")
    for k, v in data["types"].items():
        lines.append(f"  {k}: {v}")
    lines.append("")
    lines.append("--- 难度分布 ---")
    for k, v in data["difficulties"].items():
        lines.append(f"  难度 {k}: {v}")
    lines.append("")
    lines.append("--- 认知层级分布 ---")
    for k, v in data["cognitive_levels"].items():
        lines.append(f"  {k}: {v}")
    lines.append("")
    lines.append("--- 考查风格分布 ---")
    for k, v in data["styles"].items():
        lines.append(f"  {k}: {v}")
    lines.append("")
    lines.append("--- 物理主题分布 ---")
    for top, cnt in data["topics"].items():
        topic_obj = report.data.taxonomy.topics.get(top)
        title = topic_obj.title if topic_obj else top
        lines.append(f"  {top} ({title}): {cnt}")
    lines.append("")
    lines.append("--- 核心概念覆盖 ---")
    for c, cnt in data["concepts"].items():
        lines.append(f"  {c}: {cnt}")
    lines.append("")
    if data["unregistered_taxonomy"]["topics"] or data["unregistered_taxonomy"]["concepts"]:
        lines.append("--- 未登记分类（草稿题目） ---")
        if data["unregistered_taxonomy"]["topics"]:
            lines.append("  未登记主题: " + ", ".join(data["unregistered_taxonomy"]["topics"]))
        if data["unregistered_taxonomy"]["concepts"]:
            lines.append("  未登记概念: " + ", ".join(data["unregistered_taxonomy"]["concepts"]))
        lines.append("")
    lines.append(f"--- 测试集合状态与可行性 ({len(data['sets'])}) ---")
    for sid, sinfo in data["sets"].items():
        state = "可行" if sinfo["feasible"] else f"暂不可用 ({sinfo['reason']})"
        lines.append(f"  {sid} [{sinfo['status']}] ({sinfo['selection_type']}): {sinfo['title']} -> {state}")
    if data["health_warnings"]:
        lines.append("")
        lines.append("--- 题库健康度提示 ---")
        for w in data["health_warnings"]:
            lines.append(f"  * {w}")
    return "\n".join(lines) + "\n"
