import assert from "node:assert/strict";
import test from "node:test";

import { createSession, findRestorableSession, isSessionRestorable } from "../src/session.js";
import type { Question } from "../src/types.js";

const mockQuestions: Question[] = [
  {
    id: "q1",
    version: 1,
    type: "true_false",
    choiceOrder: "fixed",
    primaryObjective: "obj1",
    secondaryObjectives: [],
    conceptIds: ["concept1"],
    stemHtml: "<p>stem1</p>",
    feedback: { correctHtml: "correct", incorrectHtml: "incorrect" },
    hintsHtml: [],
    solutionHtml: "sol",
    difficulty: 1,
    cognitiveLevel: "understand",
    style: "conceptual",
    estimatedSeconds: 30,
    assets: {},
    answer: { value: true }
  },
  {
    id: "q2",
    version: 2,
    type: "single_choice",
    choiceOrder: "shuffle",
    primaryObjective: "obj2",
    secondaryObjectives: [],
    conceptIds: ["concept2"],
    stemHtml: "<p>stem2</p>",
    choices: [{ id: "A", contentHtml: "A" }],
    feedback: { correctHtml: "correct", incorrectHtml: "incorrect" },
    hintsHtml: [],
    solutionHtml: "sol",
    difficulty: 2,
    cognitiveLevel: "apply",
    style: "conceptual",
    estimatedSeconds: 45,
    assets: {},
    answer: { choice: "A" }
  }
];

test("createSession initializes a fresh session with question references", () => {
  const session = createSession("page-1", "quick", "seed-123", "fp-456", mockQuestions);
  assert.equal(session.pageId, "page-1");
  assert.equal(session.mode, "quick");
  assert.equal(session.seed, "seed-123");
  assert.equal(session.bankFingerprint, "fp-456");
  assert.equal(session.currentIndex, 0);
  assert.deepEqual(session.questionRefs, [
    { id: "q1", version: 1 },
    { id: "q2", version: 2 }
  ]);
  assert.deepEqual(session.answers, {});
  assert.deepEqual(session.uncertain, {});
  assert.deepEqual(session.locked, {});
});

test("isSessionRestorable validates mode, seed, fingerprint, and question versions", () => {
  const session = createSession("page-1", "quick", "seed-123", "fp-456", mockQuestions);

  assert.equal(isSessionRestorable(session, "quick", "seed-123", "fp-456", mockQuestions), true);
  assert.equal(isSessionRestorable(session, "full", "seed-123", "fp-456", mockQuestions), false);
  assert.equal(isSessionRestorable(session, "quick", "other-seed", "fp-456", mockQuestions), false);
  assert.equal(isSessionRestorable(session, "quick", "seed-123", "different-fp", mockQuestions), false);

  const changedVersionQuestions = [{ ...mockQuestions[0], version: 2 }, mockQuestions[1]];
  assert.equal(isSessionRestorable(session, "quick", "seed-123", "fp-456", changedVersionQuestions), false);
});

test("findRestorableSession finds matching candidate", () => {
  const s1 = createSession("page-1", "quick", "seed-1", "fp-1", mockQuestions);
  const s2 = createSession("page-1", "quick", "seed-2", "fp-1", mockQuestions);

  const candidates = [s1, s2];
  const found = findRestorableSession(candidates, "quick", "seed-2", "fp-1", mockQuestions);
  assert.equal(found, s2);

  const notFound = findRestorableSession(candidates, "full", "seed-2", "fp-1", mockQuestions);
  assert.equal(notFound, undefined);
});
