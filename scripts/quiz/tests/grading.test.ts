import assert from "node:assert/strict";
import test from "node:test";

import { gradeQuestion, isAnswerComplete, parseNumeric, summarizeObjectives } from "../src/grading.js";
import type { Question } from "../src/types.js";

const base = {
  id: "q",
  version: 1,
  choiceOrder: "fixed",
  primaryObjective: "obj",
  secondaryObjectives: [],
  conceptIds: [],
  stemHtml: "",
  feedback: { correctHtml: "", incorrectHtml: "" },
  hintsHtml: [],
  solutionHtml: "",
  difficulty: 1,
  cognitiveLevel: "understand",
  style: "conceptual",
  assets: {},
  estimatedSeconds: 10
};

test("grades all supported answer kinds", () => {
  const single = { ...base, type: "single_choice", choices: [], answer: { choice: "A" } } as Question;
  const multiple = { ...base, type: "multiple_choice", choices: [], answer: { choices: ["A", "C"] } } as Question;
  const boolean = { ...base, type: "true_false", answer: { value: true } } as Question;
  const numeric = {
    ...base,
    type: "numeric",
    answer: { value: 10, tolerance: { type: "relative", value: 0.01 }, unit: { required: true, accepted: ["m"] } }
  } as Question;
  assert.equal(gradeQuestion(single, "A"), true);
  assert.equal(gradeQuestion(multiple, ["C", "A"]), true);
  assert.equal(gradeQuestion(boolean, true), true);
  assert.equal(gradeQuestion(numeric, { value: "10.05", unit: "m" }), true);
  assert.equal(gradeQuestion(numeric, { value: "10.05", unit: "cm" }), false);
});

test("numeric parser rejects expressions and non-finite values", () => {
  assert.equal(parseNumeric("1e2"), 100);
  assert.equal(parseNumeric("1/2"), null);
  assert.equal(parseNumeric("Infinity"), null);
});

test("numeric answers become complete only after a valid value and required unit", () => {
  const numeric = {
    ...base,
    type: "numeric",
    answer: { value: 4, tolerance: { type: "absolute", value: 0.01 }, unit: { required: true, accepted: ["m"] } }
  } as Question;
  assert.equal(isAnswerComplete(numeric, null), false);
  assert.equal(isAnswerComplete(numeric, { value: "10", unit: "" }), false);
  assert.equal(isAnswerComplete(numeric, { value: "1/2", unit: "m" }), false);
  assert.equal(isAnswerComplete(numeric, { value: "10", unit: "m" }), true);
});

test("objective summaries use only the primary objective", () => {
  const summary = summarizeObjectives([
    {
      questionId: "q",
      version: 1,
      primaryObjective: "primary",
      answer: "A",
      correct: true,
      unanswered: false,
      uncertain: true
    }
  ]);
  assert.deepEqual(summary, { primary: { correct: 1, total: 1, uncertain: 1 } });
});
