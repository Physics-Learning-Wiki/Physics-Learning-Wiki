from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class SourceDocument:
    path: Path
    data: dict[str, Any]


@dataclass
class PageContract:
    path: Path
    page_id: str
    title: str
    url: str
    objectives: dict[str, dict[str, str]]
    quiz: dict[str, Any]


@dataclass
class PageRegistry:
    pages: dict[str, PageContract] = field(default_factory=dict)
    objective_to_page: dict[str, str] = field(default_factory=dict)

    def get_page(self, page_id: str) -> PageContract | None:
        return self.pages.get(page_id)

    def has_page(self, page_id: str) -> bool:
        return page_id in self.pages

    def get_page_for_objective(self, objective_id: str) -> str | None:
        return self.objective_to_page.get(objective_id)


@dataclass
class RepositoryData:
    root: Path
    questions: list[SourceDocument] = field(default_factory=list)
    blueprints: list[SourceDocument] = field(default_factory=list)
    pages: dict[str, PageContract] = field(default_factory=dict)
    page_registry: PageRegistry = field(default_factory=PageRegistry)
