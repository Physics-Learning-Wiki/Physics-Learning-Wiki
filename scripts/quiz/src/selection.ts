import { shuffle } from "./random.js";
import type { PageBundle, Question } from "./types.js";

export class SelectionError extends Error {}

export function selectQuestions(bundle: PageBundle, modeName: "quick" | "full", seed: string): Question[] {
  const mode = bundle.blueprint.modes[modeName];
  if (!mode) throw new SelectionError(`Unknown quiz mode: ${modeName}`);
  const selected: Question[] = [];
  const selectedIds = new Set<string>();
  for (const slot of mode.slots) {
    const candidates = bundle.questions.filter(
      question => slot.objectives.includes(question.primaryObjective) && !selectedIds.has(question.id)
    );
    const chosen = shuffle(candidates, `${bundle.bankFingerprint}|${seed}|${slot.id}`).slice(0, slot.count);
    if (chosen.length !== slot.count) {
      throw new SelectionError(`Slot ${slot.id} requires ${slot.count} question(s), found ${candidates.length}`);
    }
    for (const question of chosen) {
      selected.push(question);
      selectedIds.add(question.id);
    }
  }
  return shuffle(selected, `${bundle.bankFingerprint}|${seed}|final`);
}

export function selectRetry(bundle: PageBundle, ids: readonly string[]): Question[] {
  const index = new Map(bundle.questions.map(question => [question.id, question]));
  const questions = ids.map(id => index.get(id)).filter((question): question is Question => Boolean(question));
  if (questions.length !== ids.length) throw new SelectionError("One or more retry questions are no longer available");
  return questions;
}
