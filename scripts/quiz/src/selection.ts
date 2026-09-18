import { shuffle } from "./random.js";
import type {
  FilterCriterion,
  Question,
  SetBundle,
  SetConstraint,
  SetFilters,
  SetSelectionFixed,
  SetSelectionQuery,
  TaxonomyCatalog
} from "./types.js";

export const SELECTION_ALGORITHM_VERSION = 1;

export class SelectionError extends Error {}

export function combinations<T>(items: readonly T[], count: number): T[][] {
  if (count === 0) return [[]];
  const result: T[][] = [];
  for (let index = 0; index <= items.length - count; index += 1) {
    for (const tail of combinations(items.slice(index + 1), count - 1)) {
      result.push([items[index], ...tail]);
    }
  }
  return result;
}

export function getTopicDescendantsAndSelf(topicId: string, taxonomy?: TaxonomyCatalog): Set<string> {
  const result = new Set<string>([topicId]);
  if (!taxonomy || !taxonomy.topics) return result;

  let changed = true;
  while (changed) {
    changed = false;
    for (const [tid, topic] of Object.entries(taxonomy.topics)) {
      if (topic.parent && result.has(topic.parent) && !result.has(tid)) {
        result.add(tid);
        changed = true;
      }
    }
  }
  return result;
}

function matchesAnyOrAll(itemValues: readonly string[], criterion: FilterCriterion): boolean {
  if ("any" in criterion && Array.isArray(criterion.any)) {
    const target = new Set(criterion.any);
    return itemValues.some(v => target.has(v));
  }
  if ("all" in criterion && Array.isArray(criterion.all)) {
    const itemSet = new Set(itemValues);
    return criterion.all.every(v => itemSet.has(v));
  }
  return true;
}

export function matchesFilters(
  question: Question,
  filters?: SetFilters,
  taxonomy?: TaxonomyCatalog
): boolean {
  if (!filters) return true;

  // 1. Topics
  if (filters.topics) {
    const qTopics = question.topicIds ?? (question as unknown as { topics?: string[] }).topics;
    if (!qTopics || !Array.isArray(qTopics) || qTopics.length === 0) return false;

    if ("any" in filters.topics && Array.isArray(filters.topics.any)) {
      const expanded = new Set<string>();
      for (const t of filters.topics.any) {
        for (const desc of getTopicDescendantsAndSelf(t, taxonomy)) {
          expanded.add(desc);
        }
      }
      if (!qTopics.some(t => expanded.has(t))) return false;
    } else if ("all" in filters.topics && Array.isArray(filters.topics.all)) {
      for (const t of filters.topics.all) {
        const expanded = getTopicDescendantsAndSelf(t, taxonomy);
        if (!qTopics.some(qt => expanded.has(qt))) return false;
      }
    }
  }

  // 2. Concepts
  if (filters.concepts) {
    const qConcepts = question.conceptIds ?? (question as unknown as { concepts?: string[] }).concepts;
    if (!qConcepts || !Array.isArray(qConcepts) || qConcepts.length === 0) return false;
    if (!matchesAnyOrAll(qConcepts, filters.concepts)) return false;
  }

  // 3. Objectives
  if (filters.objectives) {
    const qObjs = question.objectiveIds ?? (question as unknown as { objectives?: string[] }).objectives;
    if (!qObjs || !Array.isArray(qObjs) || qObjs.length === 0) return false;
    if (!matchesAnyOrAll(qObjs, filters.objectives)) return false;
  }

  // 4. Related pages
  if (filters.related_pages) {
    const qPages = question.relatedPages ?? (question as unknown as { related_pages?: string[] }).related_pages;
    if (!qPages || !Array.isArray(qPages) || qPages.length === 0) return false;
    if (!matchesAnyOrAll(qPages, filters.related_pages)) return false;
  }

  // 5. Types
  if (filters.types && Array.isArray(filters.types)) {
    if (!filters.types.includes(question.type)) return false;
  }

  // 6. Cognitive levels
  if (filters.cognitive_levels && Array.isArray(filters.cognitive_levels)) {
    const cog = question.cognitiveLevel ?? (question as unknown as { cognitive_level?: string }).cognitive_level;
    if (!cog || !filters.cognitive_levels.includes(cog)) return false;
  }

  // 7. Styles
  if (filters.styles && Array.isArray(filters.styles)) {
    if (!question.style || !filters.styles.includes(question.style)) return false;
  }

  // 8. Question IDs
  if (filters.question_ids && Array.isArray(filters.question_ids)) {
    if (!filters.question_ids.includes(question.id)) return false;
  }

  // 9. Difficulty
  if (filters.difficulty) {
    const diff = question.difficulty;
    if (diff === undefined || typeof diff !== "number") return false;
    if (filters.difficulty.min !== undefined && diff < filters.difficulty.min) return false;
    if (filters.difficulty.max !== undefined && diff > filters.difficulty.max) return false;
  }

  return true;
}

export function satisfiesConstraints(
  selected: readonly Question[],
  constraints?: readonly SetConstraint[]
): boolean {
  if (!constraints || constraints.length === 0) return true;

  for (const c of constraints) {
    const values = c.values ?? [];
    let count = 0;
    for (const q of selected) {
      const val =
        (q as unknown as Record<string, unknown>)[c.field] ??
        (c.field === "type" ? q.type : undefined);
      if (values.includes(val as string | number)) {
        count += 1;
      }
    }
    if (c.min !== undefined && count < c.min) return false;
    if (c.max !== undefined && count > c.max) return false;
  }

  return true;
}

export function withShuffledChoices(question: Question, setId: string, seed?: string): Question {
  if (seed === undefined) return question;
  const choiceOrder =
    question.choiceOrder ?? (question as unknown as { choice_order?: "shuffle" | "fixed" }).choice_order ?? "shuffle";
  if (choiceOrder !== "shuffle") return question;

  if ((question.type === "single_choice" || question.type === "multiple_choice") && question.choices) {
    return {
      ...question,
      choices: shuffle(question.choices, `${setId}:${question.id}:choices:${seed}`)
    };
  }
  return question;
}

export function solveQuerySelection(
  pool: readonly Question[],
  query: SetSelectionQuery,
  taxonomy?: TaxonomyCatalog,
  seed?: string,
  setId = ""
): Question[] | null {
  const count = query.count;
  const topFilters = query.filters;
  const slots = query.slots ?? [];
  const constraints = query.constraints ?? [];

  // Step 1: Filter pool by top-level filters and sort by ID ascending
  const pPool = pool.filter(q => matchesFilters(q, topFilters, taxonomy));
  pPool.sort((a, b) => a.id.localeCompare(b.id));

  if (pPool.length < count) return null;

  const totalSlotCount = slots.reduce((acc, s) => acc + s.count, 0);
  if (totalSlotCount > count) return null;

  // Step 2: Slot candidates
  const slotCandidates: Question[][] = [];
  for (const slot of slots) {
    let cands = pPool.filter(q => matchesFilters(q, slot.filters, taxonomy));
    if (seed !== undefined) {
      cands = shuffle(cands, `${setId}:slot:${slot.id}:${seed}`);
    }
    slotCandidates.push(cands);
  }

  // Step 3: Backtracking search
  const assignedSlots: Question[][] = [];
  const usedIds = new Set<string>();

  function searchRemaining(
    needed: number,
    candidates: readonly Question[],
    currentSelection: readonly Question[]
  ): Question[] | null {
    if (needed === 0) {
      if (satisfiesConstraints(currentSelection, constraints)) {
        return [...currentSelection];
      }
      return null;
    }

    for (const chosen of combinations(candidates, needed)) {
      const trial = [...currentSelection, ...chosen];
      if (satisfiesConstraints(trial, constraints)) {
        return trial;
      }
    }
    return null;
  }

  function searchSlots(slotIdx: number): Question[] | null {
    if (slotIdx === slots.length) {
      const remainingNeeded = count - usedIds.size;
      let remainingCands = pPool.filter(q => !usedIds.has(q.id));
      if (remainingCands.length < remainingNeeded) return null;
      if (seed !== undefined) {
        remainingCands = shuffle(remainingCands, `${setId}:pool:${seed}`);
      }
      const flattened = assignedSlots.flat();
      return searchRemaining(remainingNeeded, remainingCands, flattened);
    }

    const slot = slots[slotIdx];
    const slotNeed = slot.count;
    const cands = slotCandidates[slotIdx].filter(q => !usedIds.has(q.id));
    if (cands.length < slotNeed) return null;

    for (const chosen of combinations(cands, slotNeed)) {
      const chosenIds = chosen.map(q => q.id);
      chosenIds.forEach(id => usedIds.add(id));
      assignedSlots.push(chosen);

      const result = searchSlots(slotIdx + 1);
      if (result !== null) return result;

      assignedSlots.pop();
      chosenIds.forEach(id => usedIds.delete(id));
    }

    return null;
  }

  const solution = searchSlots(0);
  if (!solution) return null;

  if (seed !== undefined) {
    const finalQuestions = shuffle(solution, `${setId}:order:${seed}`);
    return finalQuestions.map(q => withShuffledChoices(q, setId, seed));
  }

  return solution;
}

export function selectFixedSet(
  bundleQuestions: readonly Question[],
  selection: SetSelectionFixed,
  seed?: string,
  setId = ""
): Question[] {
  const byId = new Map(bundleQuestions.map(q => [q.id, q]));
  const questions: Question[] = [];
  for (const qid of selection.questions) {
    const q = byId.get(qid);
    if (!q) {
      throw new SelectionError(`Referenced question not found: ${qid}`);
    }
    questions.push(q);
  }

  const ordered =
    selection.order === "shuffle" && seed !== undefined
      ? shuffle(questions, `${setId}:order:${seed}`)
      : questions;

  return ordered.map(q => withShuffledChoices(q, setId, seed));
}

export function selectSetQuestions(
  bundle: SetBundle,
  seed: string,
  taxonomy?: TaxonomyCatalog
): Question[] {
  if (!bundle.runnable) {
    throw new SelectionError(bundle.unavailableReason ?? "Set is not runnable");
  }

  if (bundle.set.selection.type === "fixed") {
    return selectFixedSet(bundle.questions, bundle.set.selection, seed, bundle.set.id);
  }

  const solution = solveQuerySelection(
    bundle.questions,
    bundle.set.selection,
    taxonomy,
    seed,
    bundle.set.id
  );
  if (!solution) {
    throw new SelectionError("No candidate questions satisfy selection criteria");
  }
  return solution;
}

export function selectRetry(
  availableQuestions: readonly Question[],
  ids: readonly string[],
  setId: string,
  seed = "retry"
): Question[] {
  const byId = new Map(availableQuestions.map(q => [q.id, q]));
  const questions: Question[] = [];
  for (const id of ids) {
    const q = byId.get(id);
    if (q) {
      questions.push(withShuffledChoices(q, setId, seed));
    }
  }
  return questions;
}
