import type { TaxonomyCatalog, TaxonomyTopic } from "./types.js";

type TopicTaxonomy = Pick<TaxonomyCatalog, "topics">;

export interface TopicOption {
  id: string;
  title: string;
}

export function getTopicDescendantsAndSelf(topicId: string, taxonomy?: TopicTaxonomy): Set<string> {
  const result = new Set<string>([topicId]);
  if (!taxonomy?.topics) return result;

  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, topic] of Object.entries(taxonomy.topics)) {
      if (topic.parent && result.has(topic.parent) && !result.has(id)) {
        result.add(id);
        changed = true;
      }
    }
  }
  return result;
}

/** Uses parent links for navigation, independently of the spelling of topic IDs. */
export class TopicTree {
  readonly roots: TopicOption[];
  private readonly paths = new Map<string, TaxonomyTopic[]>();
  private readonly available = new Set<string>();
  private readonly branches = new Map<string, Set<string>>();

  constructor(private readonly taxonomy?: TopicTaxonomy, coveredTopics?: Iterable<string>) {
    const topics = taxonomy?.topics ?? {};
    for (const id of Object.keys(topics).sort()) {
      const path: TaxonomyTopic[] = [];
      const seen = new Set<string>();
      let current: string | null = id;
      while (current && topics[current] && !seen.has(current)) {
        seen.add(current);
        path.unshift(topics[current]);
        current = topics[current].parent;
      }
      // Orphans and cycles do not become invented root categories.
      if (!current) this.paths.set(id, path);
    }
    for (const id of coveredTopics ?? this.paths.keys()) {
      for (const topic of this.paths.get(id) ?? []) this.available.add(topic.id);
    }
    this.roots = [...this.paths]
      .filter(([id, path]) => path.length === 1 && this.available.has(id))
      .map(([id, path]) => ({ id, title: path[0].title }));
  }

  rootOf(topicId: string): string | undefined {
    return this.paths.get(topicId)?.[0]?.id;
  }

  subtopics(rootId: string): TopicOption[] {
    return [...this.paths]
      .filter(([id, path]) => this.available.has(id) && path.length > 1 && path[0].id === rootId)
      .map(([id, path]) => ({
        id,
        title: path
          .slice(1)
          .map(topic => topic.title)
          .join(" / ")
      }));
  }

  matches(topicIds: readonly string[] | undefined, selectedId?: string): boolean {
    if (!selectedId) return true;
    let branch = this.branches.get(selectedId);
    if (!branch) {
      branch = getTopicDescendantsAndSelf(selectedId, this.taxonomy);
      this.branches.set(selectedId, branch);
    }
    return topicIds?.some(id => branch!.has(id)) ?? false;
  }
}
