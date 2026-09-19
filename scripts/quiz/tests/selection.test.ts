import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createRandom, shuffle } from "../src/random.js";
import {
  combinations,
  matchesFilters,
  satisfiesConstraints,
  selectFixedSet,
  selectRetry,
  selectSetQuestions,
  SelectionError,
  solveQuerySelection,
  solveQuerySelectionDetailed
} from "../src/selection.js";
import type { Question, SetBundle, TaxonomyCatalog } from "../src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(__dirname, "../../../tests/question_bank/fixtures/selection_v1_golden.json");
const goldenFixture = JSON.parse(readFileSync(fixturePath, "utf-8"));

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

test("shared golden fixture selection v1 (PRNG, shuffle, backtracking, diagnostics)", () => {
  // 1. PRNG vectors
  for (const item of goldenFixture.prng_vectors) {
    const rnd = createRandom(item.seed);
    const vals = [rnd(), rnd(), rnd()];
    for (let i = 0; i < item.expected_floats.length; i += 1) {
      assert.ok(Math.abs(vals[i] - item.expected_floats[i]) < 1e-6, `PRNG mismatch for seed ${item.seed}`);
    }
  }

  // 2. Shuffle vectors
  for (const item of goldenFixture.shuffle_vectors) {
    const shuffled = shuffle(item.input, item.seed);
    assert.deepEqual(shuffled, item.expected, `Shuffle mismatch for seed ${item.seed}`);
  }

  // 3. Overlapping slots
  const solvers = goldenFixture.solvers;
  const osCase = solvers.overlapping_slots;
  const osPool = osCase.pool.map((q: any) => makeQuestion(q.id, q));
  const osSol = solveQuerySelection(osPool, osCase.query);
  assert.ok(osSol !== null);
  assert.deepEqual(new Set(osSol.map(q => q.id)), new Set(osCase.expected_ids));

  // 4. Composition constraints
  const ccCase = solvers.composition_constraints;
  const ccPool = ccCase.pool.map((q: any) => makeQuestion(q.id, q));
  const ccSol = solveQuerySelection(ccPool, ccCase.query);
  assert.ok(ccSol !== null);
  assert.deepEqual(new Set(ccSol.map(q => q.id)), new Set(ccCase.expected_ids));

  // 5. Diagnostics
  const diag = solvers.diagnostics;
  for (const [caseName, caseData] of Object.entries<any>(diag)) {
    let pool: Question[];
    if (caseName === "exhausted") {
      pool = Array.from({ length: caseData.pool_count }, (_, i) =>
        makeQuestion(`q${String(i + 1).padStart(2, "0")}`, { difficulty: caseData.pool_difficulty })
      );
    } else {
      pool = caseData.pool.map((q: any) => makeQuestion(q.id, q));
    }
    const res = solveQuerySelectionDetailed(pool, caseData.query);
    assert.equal(res.status, caseData.expected_status, `Status mismatch in ${caseName}`);
    if (res.status === "infeasible") {
      assert.equal(res.reasonCode, caseData.expected_reason_code, `Reason code mismatch in ${caseName}`);
    }
  }

  // 6. Seeded solver with choices
  if (solvers.seeded_solver_with_choices) {
    const scCase = solvers.seeded_solver_with_choices;
    const scPool = scCase.pool.map((q: any) => makeQuestion(q.id, q));
    const scRes = solveQuerySelectionDetailed(scPool, scCase.query, undefined, scCase.seed, scCase.set_id);
    assert.equal(scRes.status, "ok");
    assert.deepEqual(
      scRes.questions.map(q => q.id),
      scCase.expected_question_ids
    );
    for (const q of scRes.questions) {
      const expectedChoices = scCase.expected_choice_ids[q.id];
      assert.deepEqual(
        q.choices?.map(c => c.id),
        expectedChoices
      );
    }
  }
});

test("combinations generator evaluates lazily and avoids combinatorial blowup", () => {
  // 1. Correctness of lexicographical generation
  const small = ["a", "b", "c", "d"];
  const gen = Array.from(combinations(small, 2));
  assert.equal(gen.length, 6);
  assert.deepEqual(gen, [
    ["a", "b"],
    ["a", "c"],
    ["a", "d"],
    ["b", "c"],
    ["b", "d"],
    ["c", "d"]
  ]);

  // 2. Huge combinations: C(40, 20) is 137,846,528,820!
  // Eager allocation would immediately freeze or crash the process.
  // Generator should return first item in < 1ms:
  const large = Array.from({ length: 40 }, (_, i) => `item-${i}`);
  const largeGen = combinations(large, 20);
  const first = largeGen.next();
  assert.equal(first.done, false);
  assert.equal(first.value.length, 20);

  // 3. Solver on large pool (30 items, need 15) finishes in milliseconds without OOM
  const pool = Array.from({ length: 30 }, (_, i) =>
    makeQuestion(`q-${i}`, { difficulty: 2 })
  );
  const start = performance.now();
  const res = solveQuerySelectionDetailed(pool, {
    type: "query",
    count: 15,
    constraints: [{ field: "difficulty", values: [1], min: 1 }]
  });
  const elapsed = performance.now() - start;
  assert.equal(res.status, "exhausted");
  assert.ok(elapsed < 200, `Expected search to terminate within 200ms, took ${elapsed}ms`);
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
