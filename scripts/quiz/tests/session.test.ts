import assert from "node:assert/strict";
import test from "node:test";

import { createSession, findRestorableSession, inspectSessionStatus, isSessionRestorable } from "../src/session.js";
import type { Question, QuizSource } from "../src/types.js";

const mockQuestions: Question[] = [
  {
    id: "q1",
    version: 1,
    status: "published",
    type: "true_false",
    choiceOrder: "fixed",
    topicIds: ["mechanics.dynamics"],
    conceptIds: ["concept1"],
    objectiveIds: ["obj1"],
    relatedPages: [],
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
    status: "published",
    type: "single_choice",
    choiceOrder: "shuffle",
    topicIds: ["mechanics.dynamics"],
    conceptIds: ["concept2"],
    objectiveIds: ["obj2"],
    relatedPages: [],
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

const mockSource: QuizSource = { type: "set", id: "mechanics.dynamics.newton-laws.quick" };

test("createSession initializes a fresh session with question references", () => {
  const session = createSession(mockSource, "seed-123", "fp-456", 1, false, mockQuestions);
  assert.ok(session.sessionId.length > 0);
  assert.deepEqual(session.source, mockSource);
  assert.equal(session.seed, "seed-123");
  assert.equal(session.bankFingerprint, "fp-456");
  assert.equal(session.selectionAlgorithmVersion, 1);
  assert.equal(session.preview, false);
  assert.equal(session.state, "active");
  assert.equal(session.currentIndex, 0);
  assert.deepEqual(session.questionRefs, [
    { id: "q1", version: 1 },
    { id: "q2", version: 2 }
  ]);
  assert.deepEqual(session.answers, {});
  assert.deepEqual(session.uncertain, {});
  assert.deepEqual(session.locked, {});
});

test("isSessionRestorable validates source, seed, fingerprint, algorithm version, and question versions", () => {
  const session = createSession(mockSource, "seed-123", "fp-456", 1, false, mockQuestions);

  assert.equal(isSessionRestorable(session, mockSource, "seed-123", "fp-456", 1, mockQuestions), true);
  assert.equal(isSessionRestorable(session, { type: "set", id: "other-set" }, "seed-123", "fp-456", 1, mockQuestions), false);
  assert.equal(isSessionRestorable(session, mockSource, "other-seed", "fp-456", 1, mockQuestions), false);
  assert.equal(isSessionRestorable(session, mockSource, "seed-123", "different-fp", 1, mockQuestions), false);
  assert.equal(isSessionRestorable(session, mockSource, "seed-123", "fp-456", 2, mockQuestions), false);

  const changedVersionQuestions = [{ ...mockQuestions[0], version: 2 }, mockQuestions[1]];
  assert.equal(isSessionRestorable(session, mockSource, "seed-123", "fp-456", 1, changedVersionQuestions), false);
});

test("findRestorableSession finds matching candidate", () => {
  const s1 = createSession(mockSource, "seed-1", "fp-1", 1, false, mockQuestions);
  const s2 = createSession(mockSource, "seed-2", "fp-1", 1, false, mockQuestions);

  const candidates = [s1, s2];
  const found = findRestorableSession(candidates, mockSource, "seed-2", "fp-1", 1, mockQuestions);
  assert.equal(found, s2);

  const notFound = findRestorableSession(candidates, { type: "set", id: "other-set" }, "seed-2", "fp-1", 1, mockQuestions);
  assert.equal(notFound, undefined);
});

test("inspectSessionStatus distinguishes none, restorable, and stale with reason", () => {
  const session = createSession(mockSource, "seed-1", "fp-current", 1, false, mockQuestions);
  const candidates = [session];

  // 1. None: seed does not match
  const noneRes = inspectSessionStatus(candidates, mockSource, "different-seed", "fp-current", 1, mockQuestions);
  assert.equal(noneRes.status, "none");

  // 2. Restorable: all matched
  const okRes = inspectSessionStatus(candidates, mockSource, "seed-1", "fp-current", 1, mockQuestions);
  assert.equal(okRes.status, "restorable");
  if (okRes.status === "restorable") {
    assert.equal(okRes.session, session);
  }

  // 3. Stale on fingerprint mismatch
  const staleFp = inspectSessionStatus(candidates, mockSource, "seed-1", "fp-updated", 1, mockQuestions);
  assert.equal(staleFp.status, "stale");
  if (staleFp.status === "stale") {
    assert.ok(staleFp.reason.includes("指纹"));
  }

  // 4. Stale on algorithm version change
  const staleAlgo = inspectSessionStatus(candidates, mockSource, "seed-1", "fp-current", 2, mockQuestions);
  assert.equal(staleAlgo.status, "stale");
  if (staleAlgo.status === "stale") {
    assert.ok(staleAlgo.reason.includes("算法"));
  }

  // 5. Stale on question version change
  const updatedQuestions = [{ ...mockQuestions[0], version: 2 }, mockQuestions[1]];
  const staleQVer = inspectSessionStatus(candidates, mockSource, "seed-1", "fp-current", 1, updatedQuestions);
  assert.equal(staleQVer.status, "stale");
  if (staleQVer.status === "stale") {
    assert.ok(staleQVer.reason.includes("版本"));
  }
});

