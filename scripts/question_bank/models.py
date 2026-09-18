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
class Topic:
    id: str
    title: str
    parent: str | None = None


@dataclass
class Concept:
    id: str
    title: str
    topics: list[str] = field(default_factory=list)
    aliases: list[str] = field(default_factory=list)


@dataclass
class TaxonomyRegistry:
    topics: dict[str, Topic] = field(default_factory=dict)
    concepts: dict[str, Concept] = field(default_factory=dict)
    topic_descendants: dict[str, set[str]] = field(default_factory=dict)

    def is_valid_topic(self, topic_id: str) -> bool:
        return topic_id in self.topics

    def is_valid_concept(self, concept_id: str) -> bool:
        return concept_id in self.concepts

    def get_topic_descendants_and_self(self, topic_id: str) -> set[str]:
        if topic_id not in self.topic_descendants:
            return {topic_id}
        return self.topic_descendants[topic_id] | {topic_id}


@dataclass
class FixedSelection:
    type: str
    questions: list[str]
    order: str


@dataclass
class Slot:
    id: str
    count: int
    filters: dict[str, Any] = field(default_factory=dict)


@dataclass
class Constraint:
    field: str
    values: list[Any]
    min: int | None = None
    max: int | None = None


@dataclass
class QuerySelection:
    type: str
    count: int
    filters: dict[str, Any] = field(default_factory=dict)
    slots: list[Slot] = field(default_factory=list)
    constraints: list[Constraint] = field(default_factory=list)


@dataclass
class QuizSet:
    id: str
    title: str
    description: str
    status: str
    tags: list[str]
    feedback_mode: str
    selection: FixedSelection | QuerySelection
    path: Path | None = None


@dataclass
class RepositoryData:
    root: Path
    questions: list[SourceDocument] = field(default_factory=list)
    blueprints: list[SourceDocument] = field(default_factory=list)
    sets: list[SourceDocument] = field(default_factory=list)
    pages: dict[str, PageContract] = field(default_factory=dict)
    page_registry: PageRegistry = field(default_factory=PageRegistry)
    taxonomy: TaxonomyRegistry = field(default_factory=TaxonomyRegistry)
