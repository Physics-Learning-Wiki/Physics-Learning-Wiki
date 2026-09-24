import assert from "node:assert/strict";
import test from "node:test";

import {
  countProgress,
  gradeQuestion,
  isAnswerComplete,
  makeResult,
  parseNumeric,
  summarizeConcepts,
  summarizeObjectives
} from "../src/grading.js";
import type { Question } from "../src/types.js";

const base = {
  id: "q",
  version: 1,
  status: "published" as const,
  choiceOrder: "fixed" as const,
  topicIds: ["mechanics.dynamics"],
  conceptIds: ["concept-1"],
  objectiveIds: ["obj-1"],
  relatedPages: [],
  stemHtml: "",
  feedback: { correctHtml: "", incorrectHtml: "" },
  hintsHtml: [],
  solutionHtml: "",
  difficulty: 1,
  cognitiveLevel: "understand" as const,
  style: "conceptual" as const,
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
  assert.equal(makeResult(numeric, { value: "10", unit: "" }, false).unanswered, true);
  assert.deepEqual(countProgress([numeric], { q: { value: "10", unit: "" } }, { q: true }), {
    answered: 0,
    unanswered: 1,
    uncertain: 1
  });
});

test("concept and objective summaries aggregate correctly", () => {
  const q1 = {
    ...base,
    id: "q1",
    type: "single_choice",
    answer: { choice: "A" },
    conceptIds: ["c1", "c2"],
    objectiveIds: ["o1"]
  } as unknown as Question;
  const q2 = {
    ...base,
    id: "q2",
    type: "single_choice",
    answer: { choice: "B" },
    conceptIds: ["c2"],
    objectiveIds: ["o2"]
  } as unknown as Question;

  const r1 = makeResult(q1, "A", false);
  const r2 = makeResult(q2, "wrong", true);

  const conceptSum = summarizeConcepts([r1, r2]);
  assert.equal(conceptSum["c1"].total, 1);
  assert.equal(conceptSum["c1"].correct, 1);
  assert.equal(conceptSum["c2"].total, 2);
  assert.equal(conceptSum["c2"].uncertain, 1);

  const objSum = summarizeObjectives([r1, r2]);
  assert.equal(objSum["o1"].total, 1);
  assert.equal(objSum["o2"].total, 1);
  assert.equal(objSum["o2"].uncertain, 1);
});

test("minimal draft question without feedback or metadata grades safely", () => {
  const draftQuestion: Question = {
    id: "q-draft",
    version: 1,
    status: "draft" as const,
    type: "single_choice" as const,
    choiceOrder: "fixed" as const,
    topicIds: [],
    conceptIds: [],
    objectiveIds: [],
    relatedPages: [],
    stemHtml: "<p>stem</p>",
    hintsHtml: [],
    solutionHtml: "sol",
    assets: {},
    choices: [
      { id: "A", contentHtml: "A" },
      { id: "B", contentHtml: "B" }
    ],
    answer: { choice: "A" }
  };
  assert.equal(gradeQuestion(draftQuestion, "A"), true);
  assert.equal(gradeQuestion(draftQuestion, "B"), false);
  const res = makeResult(draftQuestion, "A", false);
  assert.equal(res.correct, true);
});
