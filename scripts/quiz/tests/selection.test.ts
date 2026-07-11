import assert from "node:assert/strict";
import test from "node:test";

import { selectQuestions, SelectionError } from "../src/selection.js";
import type { PageBundle, Question } from "../src/types.js";

const question = (id: string, objective: string): Question => ({
  id,
  version: 1,
  type: "true_false",
  primaryObjective: objective,
  secondaryObjectives: [],
  conceptIds: [],
  stemHtml: "",
  answer: { value: true },
  feedback: { correctHtml: "", incorrectHtml: "" },
  hintsHtml: [],
  solutionHtml: "",
  difficulty: 1,
  estimatedSeconds: 10
});
const bundle: PageBundle = {
  schemaVersion: 1,
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
        ]
      },
      full: {
        title: "Full",
        total: 2,
        feedback_mode: "deferred",
        slots: [
          { id: "a", count: 1, objectives: ["a"] },
          { id: "b", count: 1, objectives: ["b"] }
        ]
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
