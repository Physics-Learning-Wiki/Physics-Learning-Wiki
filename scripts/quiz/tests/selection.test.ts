import assert from "node:assert/strict";
import test from "node:test";

import { selectQuestions, SelectionError } from "../src/selection.js";
import type { PageBundle, Question } from "../src/types.js";

const question = (id: string, objective: string): Question => ({
  id,
  version: 1,
  type: "true_false",
  choiceOrder: "fixed",
  primaryObjective: objective,
  secondaryObjectives: [],
  conceptIds: [],
  stemHtml: "",
  answer: { value: true },
  feedback: { correctHtml: "", incorrectHtml: "" },
  hintsHtml: [],
  solutionHtml: "",
  difficulty: 1,
  cognitiveLevel: "understand",
  style: "conceptual",
  assets: {},
  estimatedSeconds: 10
});
const bundle: PageBundle = {
  schemaVersion: 2,
  bankFingerprint: "bank",
  preview: true,
  page: { id: "page", title: "Page", url: "../../page/", objectives: [] },
  blueprint: {
    modes: {
      quick: {
        title: "Quick",
        total: 2,
        feedback_mode: "immediate",
        slots: [
          { id: "a", count: 1, objectives: ["a"] },
          { id: "b", count: 1, objectives: ["b"] }
        ],
        constraints: []
      },
      full: {
        title: "Full",
        total: 2,
        feedback_mode: "deferred",
        slots: [
          { id: "a", count: 1, objectives: ["a"] },
          { id: "b", count: 1, objectives: ["b"] }
        ],
        constraints: []
      }
    }
  },
  questions: [question("a1", "a"), question("a2", "a"), question("b1", "b")]
};

test("selection is reproducible and does not duplicate questions", () => {
  const first = selectQuestions(bundle, "quick", "seed");
  const second = selectQuestions(bundle, "quick", "seed");
  assert.deepEqual(
    first.map(item => item.id),
    second.map(item => item.id)
  );
  assert.equal(new Set(first.map(item => item.id)).size, 2);
});

test("selection reports an unsatisfied slot", () => {
  const missing = { ...bundle, questions: bundle.questions.filter(item => item.primaryObjective !== "b") };
  assert.throws(() => selectQuestions(missing, "quick", "seed"), SelectionError);
});

test("selection satisfies composition constraints", () => {
  const constrained = structuredClone(bundle);
  constrained.blueprint.modes.quick.constraints = [{ field: "difficulty", values: [2], min: 1 }];
  constrained.questions[0].difficulty = 2;
  assert.equal(
    selectQuestions(constrained, "quick", "seed").some(item => item.difficulty === 2),
    true
  );
});
