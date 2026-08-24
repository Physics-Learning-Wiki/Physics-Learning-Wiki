import { shuffle } from "./random.js";
import type { BlueprintMode, PageBundle, Question } from "./types.js";

export class SelectionError extends Error {}

function combinations<T>(items: readonly T[], count: number): T[][] {
  if (count === 0) return [[]];
  const result: T[][] = [];
  for (let index = 0; index <= items.length - count; index += 1) {
    for (const tail of combinations(items.slice(index + 1), count - 1)) result.push([items[index], ...tail]);
  }
  return result;
}

function matchesConstraint(question: Question, field: "difficulty" | "type" | "style", values: Array<string | number>) {
  return values.includes(question[field]);
}

export function satisfiesConstraints(questions: readonly Question[], mode: BlueprintMode): boolean {
  return mode.constraints.every(constraint => {
    const count = questions.filter(question => matchesConstraint(question, constraint.field, constraint.values)).length;
    return count >= (constraint.min ?? 0) && count <= (constraint.max ?? mode.total);
  });
}

function violatesMaximum(questions: readonly Question[], mode: BlueprintMode): boolean {
  return mode.constraints.some(
    constraint =>
      constraint.max !== undefined &&
      questions.filter(question => matchesConstraint(question, constraint.field, constraint.values)).length >
        constraint.max
  );
}

function withShuffledChoices(question: Question, seed: string): Question {
  if (question.choiceOrder !== "shuffle" || (question.type !== "single_choice" && question.type !== "multiple_choice"))
    return question;
  return { ...question, choices: shuffle(question.choices, `${seed}|${question.id}|choices`) };
}

export function selectQuestions(bundle: PageBundle, modeName: "quick" | "full", seed: string): Question[] {
  const mode = bundle.blueprint.modes[modeName];
  if (!mode) throw new SelectionError(`Unknown quiz mode: ${modeName}`);
  const search = (slotIndex: number, selected: Question[], selectedIds: Set<string>): Question[] | null => {
    if (slotIndex === mode.slots.length) return satisfiesConstraints(selected, mode) ? selected : null;
    const slot = mode.slots[slotIndex];
    const candidates = bundle.questions.filter(
      question => slot.objectives.includes(question.primaryObjective) && !selectedIds.has(question.id)
    );
    if (candidates.length < slot.count) {
      throw new SelectionError(`Slot ${slot.id} requires ${slot.count} question(s), found ${candidates.length}`);
    }
    const ordered = shuffle(candidates, `${bundle.bankFingerprint}|${seed}|${slot.id}`);
    for (const chosen of combinations(ordered, slot.count)) {
      const next = [...selected, ...chosen];
      if (violatesMaximum(next, mode)) continue;
      const nextIds = new Set(selectedIds);
      chosen.forEach(question => nextIds.add(question.id));
      const result = search(slotIndex + 1, next, nextIds);
      if (result) return result;
    }
    return null;
  };
  const selected = search(0, [], new Set());
  if (!selected) throw new SelectionError(`No ${modeName} question set satisfies the blueprint constraints`);
  return shuffle(selected, `${bundle.bankFingerprint}|${seed}|final`).map(question =>
    withShuffledChoices(question, `${bundle.bankFingerprint}|${seed}`)
  );
}

export function selectRetry(bundle: PageBundle, ids: readonly string[], seed = "retry"): Question[] {
  const index = new Map(bundle.questions.map(question => [question.id, question]));
  const questions = ids.map(id => index.get(id)).filter((question): question is Question => Boolean(question));
  if (questions.length !== ids.length) throw new SelectionError("One or more retry questions are no longer available");
  return questions.map(question => withShuffledChoices(question, `${bundle.bankFingerprint}|${seed}`));
}
