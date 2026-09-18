import assert from "node:assert/strict";
import test from "node:test";

import { createRandom, shuffle } from "../src/random.js";
import {
  matchesFilters,
  satisfiesConstraints,
  selectFixedSet,
  selectRetry,
  selectSetQuestions,
  SelectionError,
  solveQuerySelection
} from "../src/selection.js";
import type { Question, SetBundle, TaxonomyCatalog } from "../src/types.js";

const makeQuestion = (
  id: string,
  overrides: Partial<Question> = {}
): Question =>
  ({
    id,
    version: 1,
    status: "published",
    type: "single_choice",
    choiceOrder: "shuffle",
    topicIds: ["mechanics.dynamics"],
    conceptIds: ["newton.inertia"],
    objectiveIds: ["obj1"],
    relatedPages: ["mechanics.dynamics.newton-laws"],
    stemHtml: `<p>${id}</p>`,
    choices: [
      { id: "A", contentHtml: "Choice A" },
      { id: "B", contentHtml: "Choice B" },
      { id: "C", contentHtml: "Choice C" }
    ],
    answer: { choice: "A" },
    feedback: { correctHtml: "ok", incorrectHtml: "no" },
    hintsHtml: [],
    solutionHtml: "sol",
    difficulty: 1,
    cognitiveLevel: "understand",
    style: "conceptual",
    estimatedSeconds: 30,
    assets: {},
    ...overrides
  } as Question);

const mockTaxonomy: TaxonomyCatalog = {
  topics: {
    mechanics: { id: "mechanics", title: "经典力学", parent: null },
    "mechanics.dynamics": { id: "mechanics.dynamics", title: "动力学", parent: "mechanics" },
    "mechanics.kinematics": { id: "mechanics.kinematics", title: "运动学", parent: "mechanics" }
  },
  concepts: {
    "newton.inertia": { id: "newton.inertia", title: "惯性", topics: ["mechanics.dynamics"] }
  }
};

test("mulberry32 PRNG and shuffle match golden vectors", () => {
  const rnd = createRandom("test-seed");
  const values = [rnd(), rnd(), rnd()];
  assert.ok(Math.abs(values[0] - 0.3584189757) < 1e-6);
  assert.ok(Math.abs(values[1] - 0.5269410228) < 1e-6);
  assert.ok(Math.abs(values[2] - 0.1207547213) < 1e-6);

  const items = ["q1", "q2", "q3", "q4", "q5"];
  const s1 = shuffle(items, "seed-abc");
  const s2 = shuffle(items, "seed-abc");
  assert.deepEqual(s1, s2);
  assert.deepEqual(s1, ["q2", "q3", "q5", "q1", "q4"]);
});

test("filter matching with taxonomy and metadata", () => {
  const q = makeQuestion("q1", {
    topicIds: ["mechanics.dynamics"],
    conceptIds: ["newton.inertia"],
    objectiveIds: ["obj1", "obj2"],
    relatedPages: ["page-newton"],
    difficulty: 2,
    cognitiveLevel: "apply",
    style: "computational",
    type: "numeric"
  });

  // Parent topic matching
  assert.equal(matchesFilters(q, { topics: { any: ["mechanics"] } }, mockTaxonomy), true);
  assert.equal(matchesFilters(q, { topics: { all: ["mechanics"] } }, mockTaxonomy), true);
  assert.equal(matchesFilters(q, { topics: { any: ["mechanics.kinematics"] } }, mockTaxonomy), false);

  // Concept any/all
  assert.equal(matchesFilters(q, { concepts: { any: ["newton.inertia"] } }), true);
  assert.equal(matchesFilters(q, { concepts: { all: ["newton.inertia", "other"] } }), false);

  // Objectives any/all
  assert.equal(matchesFilters(q, { objectives: { any: ["obj1"] } }), true);
  assert.equal(matchesFilters(q, { objectives: { all: ["obj1", "obj2"] } }), true);
  assert.equal(matchesFilters(q, { objectives: { all: ["obj1", "obj3"] } }), false);

  // Related pages
  assert.equal(matchesFilters(q, { related_pages: { any: ["page-newton"] } }), true);
  assert.equal(matchesFilters(q, { related_pages: { any: ["page-other"] } }), false);

  // Types, cognitive levels, styles, question_ids
  assert.equal(matchesFilters(q, { types: ["numeric"] }), true);
  assert.equal(matchesFilters(q, { types: ["single_choice"] }), false);
  assert.equal(matchesFilters(q, { cognitive_levels: ["apply"] }), true);
  assert.equal(matchesFilters(q, { cognitive_levels: ["remember"] }), false);
  assert.equal(matchesFilters(q, { styles: ["computational"] }), true);
  assert.equal(matchesFilters(q, { styles: ["conceptual"] }), false);
  assert.equal(matchesFilters(q, { question_ids: ["q1"] }), true);
  assert.equal(matchesFilters(q, { question_ids: ["q2"] }), false);

  // Difficulty range
  assert.equal(matchesFilters(q, { difficulty: { min: 1, max: 2 } }), true);
  assert.equal(matchesFilters(q, { difficulty: { min: 3 } }), false);
  assert.equal(matchesFilters(q, { difficulty: { max: 1 } }), false);

  // Draft question missing metadata does not match when restricted
  const draftQ = { id: "q-draft", version: 1, status: "draft", type: "true_false" } as Question;
  assert.equal(matchesFilters(draftQ, { difficulty: { min: 1 } }), false);
  assert.equal(matchesFilters(draftQ, { styles: ["conceptual"] }), false);
  assert.equal(matchesFilters(draftQ, { types: ["true_false"] }), true);
});

test("satisfiesConstraints checks min and max bounds", () => {
  const qs = [
    makeQuestion("q1", { difficulty: 1, style: "conceptual" }),
    makeQuestion("q2", { difficulty: 2, style: "computational" }),
    makeQuestion("q3", { difficulty: 2, style: "conceptual" })
  ];

  assert.equal(
    satisfiesConstraints(qs, [{ field: "difficulty", values: [2], min: 2, max: 2 }]),
    true
  );
  assert.equal(
    satisfiesConstraints(qs, [{ field: "difficulty", values: [2], min: 3 }]),
    false
  );
  assert.equal(
    satisfiesConstraints(qs, [{ field: "style", values: ["conceptual"], min: 1, max: 2 }]),
    true
  );
});

test("overlapping slots backtracking solves optimally", () => {
  // Slot A can take q1 or q2 (count 1)
  // Slot B can ONLY take q1 (count 1)
  // Greedy assignment would pick q1 for A and fail B.
  // Backtracking solver must find {q1, q2}.
  const pool = [
    makeQuestion("q1", { topicIds: ["mechanics.dynamics"] }),
    makeQuestion("q2", { topicIds: ["mechanics.dynamics"] })
  ];
  const query = {
    type: "query" as const,
    count: 2,
    slots: [
      { id: "slot-a", count: 1, filters: { question_ids: ["q1", "q2"] } },
      { id: "slot-b", count: 1, filters: { question_ids: ["q1"] } }
    ]
  };

  const solution = solveQuerySelection(pool, query);
  assert.ok(solution !== null);
  assert.equal(solution.length, 2);
  const ids = new Set(solution.map(q => q.id));
  assert.deepEqual(ids, new Set(["q1", "q2"]));
});

test("backtracking with composition constraints", () => {
  // 4 questions in pool, count = 2
  // slot A takes q1 or q2 (count 1)
  // remaining fills 1 from {q3, q4}
  // constraint: difficulty 1 must be exactly 2
  // q1: diff 1, q2: diff 2, q3: diff 2, q4: diff 1
  const pool = [
    makeQuestion("q1", { difficulty: 1 }),
    makeQuestion("q2", { difficulty: 2 }),
    makeQuestion("q3", { difficulty: 2 }),
    makeQuestion("q4", { difficulty: 1 })
  ];
  const query = {
    type: "query" as const,
    count: 2,
    slots: [{ id: "slot-a", count: 1, filters: { question_ids: ["q1", "q2"] } }],
    constraints: [{ field: "difficulty" as const, values: [1], min: 2, max: 2 }]
  };

  const solution = solveQuerySelection(pool, query);
  assert.ok(solution !== null);
  const ids = new Set(solution.map(q => q.id));
  assert.deepEqual(ids, new Set(["q1", "q4"]));
});

test("fixed set order fixed vs shuffle", () => {
  const qs = [makeQuestion("q1"), makeQuestion("q2"), makeQuestion("q3")];

  const fixed = selectFixedSet(qs, { type: "fixed", questions: ["q3", "q1", "q2"], order: "fixed" }, "seed");
  assert.deepEqual(fixed.map(q => q.id), ["q3", "q1", "q2"]);

  const shuffled1 = selectFixedSet(qs, { type: "fixed", questions: ["q1", "q2", "q3"], order: "shuffle" }, "seed-x");
  const shuffled2 = selectFixedSet(qs, { type: "fixed", questions: ["q1", "q2", "q3"], order: "shuffle" }, "seed-x");
  assert.deepEqual(shuffled1.map(q => q.id), shuffled2.map(q => q.id));
});

test("choice shuffle is deterministic by seed and question id", () => {
  const q = makeQuestion("q1", {
    choiceOrder: "shuffle",
    choices: [
      { id: "A", contentHtml: "A" },
      { id: "B", contentHtml: "B" },
      { id: "C", contentHtml: "C" },
      { id: "D", contentHtml: "D" }
    ]
  });

  const res1 = selectFixedSet([q], { type: "fixed", questions: ["q1"], order: "fixed" }, "seed-1", "test-set");
  const res2 = selectFixedSet([q], { type: "fixed", questions: ["q1"], order: "fixed" }, "seed-1", "test-set");
  assert.deepEqual((res1[0] as { choices?: unknown }).choices, (res2[0] as { choices?: unknown }).choices);

  // Choice order fixed remains unchanged
  const qFixed = { ...q, choiceOrder: "fixed" as const };
  const resFixed = selectFixedSet([qFixed], { type: "fixed", questions: ["q1"], order: "fixed" }, "seed-1", "test-set");
  assert.deepEqual((resFixed[0] as { choices?: Array<{ id: string }> }).choices?.map(c => c.id), ["A", "B", "C", "D"]);
});

test("selectSetQuestions respects runnable and throws on missing criteria", () => {
  const bundle: SetBundle = {
    schemaVersion: 3,
    bankFingerprint: "fp",
    selectionAlgorithmVersion: 1,
    preview: false,
    set: {
      schema_version: 1,
      id: "set-1",
      title: "Set 1",
      status: "published",
      feedback_mode: "immediate",
      selection: { type: "fixed", questions: ["q1", "missing"], order: "fixed" }
    },
    runnable: true,
    unavailableReason: null,
    questions: [makeQuestion("q1")]
  };

  assert.throws(() => selectSetQuestions(bundle, "seed"), SelectionError);

  const unrunnableBundle = { ...bundle, runnable: false, unavailableReason: "Cannot run" };
  assert.throws(() => selectSetQuestions(unrunnableBundle, "seed"), SelectionError);
});

test("selectRetry returns available questions in requested order", () => {
  const pool = [makeQuestion("q1"), makeQuestion("q2"), makeQuestion("q3")];
  const retry = selectRetry(pool, ["q3", "q1"], "set-1", "seed");
  assert.deepEqual(retry.map(q => q.id), ["q3", "q1"]);
});
