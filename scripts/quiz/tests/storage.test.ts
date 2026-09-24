import assert from "node:assert/strict";
import test from "node:test";

import { QuizStore, STORAGE_KEY_PREVIEW, STORAGE_KEY_PROD } from "../src/storage.js";
import type { Attempt, QuizSource, Session } from "../src/types.js";

const mockSource: QuizSource = { type: "set", id: "mechanics.newton.quick" };

const mockSession: Session = {
  sessionId: "s-123",
  preview: false,
  selectionAlgorithmVersion: 1,
  state: "active",
  source: mockSource,
  seed: "seed-1",
  bankFingerprint: "fp",
  questionRefs: [{ id: "q1", version: 1 }],
  answers: {},
  uncertain: {},
  locked: {},
  currentIndex: 0,
  startedAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z"
};

test("storage failure degrades to memory", () => {
  const store = new QuizStore(
    {
      getItem: () => null,
      setItem: () => {
        throw new Error("blocked");
      }
    },
    false
  );
  assert.equal(store.persistent, false);
  assert.equal(store.read().schemaVersion, 2);
});

test("runtime write failure keeps the latest state in memory", () => {
  let writes = 0;
  const store = new QuizStore({
    getItem: () =>
      JSON.stringify({
        schemaVersion: 2,
        activeSessions: {},
        attempts: [],
        wrongQuestions: {},
        preferences: { restoreSession: true }
      }),
    setItem: () => {
      writes += 1;
      if (writes === 2) throw new Error("quota exceeded");
    }
  });

  assert.equal(store.persistent, true);
  store.saveSession(mockSession);

  assert.equal(store.persistent, false);
  assert.deepEqual(store.getActiveSessions(mockSource), [mockSession]);
});

test("storage keys separate production and preview", () => {
  const recordedKeys = new Set<string>();
  const mockStorage = {
    getItem: (k: string) => {
      recordedKeys.add(k);
      return null;
    },
    setItem: (k: string) => {
      recordedKeys.add(k);
    }
  };

  new QuizStore(mockStorage, false);
  assert.ok(recordedKeys.has(STORAGE_KEY_PROD));
  assert.ok(!recordedKeys.has(STORAGE_KEY_PREVIEW));

  recordedKeys.clear();
  new QuizStore(mockStorage, true);
  assert.ok(recordedKeys.has(STORAGE_KEY_PREVIEW));
  assert.ok(!recordedKeys.has(STORAGE_KEY_PROD));
});

test("unknown storage versions or old schema v1 reset safely", () => {
  const storageMap: Record<string, string> = {
    [STORAGE_KEY_PROD]: JSON.stringify({ schemaVersion: 1, attempts: [{ old: true }] })
  };
  const store = new QuizStore({
    getItem: (k: string) => storageMap[k] ?? null,
    setItem: (k: string, next: string) => {
      storageMap[k] = next;
    }
  });
  // Must reset to empty schemaVersion 2, ignoring v1
  assert.equal(store.getResetReason(), "version_mismatch");
  assert.equal(store.read().schemaVersion, 2);
  assert.equal(store.read().attempts.length, 0);
  assert.ok(storageMap[STORAGE_KEY_PROD].includes('"schemaVersion":2'));
});

test("corrupted json or structurally invalid storage resets with corrupt_data reason", () => {
  const storageMap: Record<string, string> = {
    [STORAGE_KEY_PROD]: "invalid-json{{"
  };
  const store = new QuizStore({
    getItem: (k: string) => storageMap[k] ?? null,
    setItem: (k: string, next: string) => {
      storageMap[k] = next;
    }
  });
  assert.equal(store.getResetReason(), "corrupt_data");
  assert.equal(store.read().schemaVersion, 2);
  assert.ok(storageMap[STORAGE_KEY_PROD].includes('"schemaVersion":2'));

  // Corrupt structure: attempts is an object instead of array
  const storageMap2: Record<string, string> = {
    [STORAGE_KEY_PROD]: JSON.stringify({ schemaVersion: 2, activeSessions: {}, attempts: {}, wrongQuestions: {} })
  };
  const store2 = new QuizStore({
    getItem: (k: string) => storageMap2[k] ?? null,
    setItem: (k: string, next: string) => {
      storageMap2[k] = next;
    }
  });
  assert.equal(store2.getResetReason(), "corrupt_data");
  assert.equal(store2.read().schemaVersion, 2);

  // Nested corrupt session
  const storageMap3: Record<string, string> = {
    [STORAGE_KEY_PROD]: JSON.stringify({
      schemaVersion: 2,
      activeSessions: { "set:x": null },
      attempts: [],
      wrongQuestions: {}
    })
  };
  const store3 = new QuizStore({
    getItem: (k: string) => storageMap3[k] ?? null,
    setItem: (k: string, next: string) => {
      storageMap3[k] = next;
    }
  });
  assert.equal(store3.getResetReason(), "corrupt_data");
  assert.equal(store3.read().schemaVersion, 2);

  // Nested corrupt session object
  const storageMap4: Record<string, string> = {
    [STORAGE_KEY_PROD]: JSON.stringify({
      schemaVersion: 2,
      activeSessions: { "set:x": [{ invalid: true }] },
      attempts: [],
      wrongQuestions: {}
    })
  };
  const store4 = new QuizStore({
    getItem: (k: string) => storageMap4[k] ?? null,
    setItem: (k: string, next: string) => {
      storageMap4[k] = next;
    }
  });
  assert.equal(store4.getResetReason(), "corrupt_data");

  // Corrupt wrongQuestions values
  const storageMap5: Record<string, string> = {
    [STORAGE_KEY_PROD]: JSON.stringify({
      schemaVersion: 2,
      activeSessions: {},
      attempts: [],
      wrongQuestions: { q1: 123 }
    })
  };
  const store5 = new QuizStore({
    getItem: (k: string) => storageMap5[k] ?? null,
    setItem: (k: string, next: string) => {
      storageMap5[k] = next;
    }
  });
  assert.equal(store5.getResetReason(), "corrupt_data");
});

test("consumeResetReason returns reset reason once and clears it", () => {
  const storageMap: Record<string, string> = {
    [STORAGE_KEY_PROD]: JSON.stringify({ schemaVersion: 1 })
  };
  const store = new QuizStore({
    getItem: (k: string) => storageMap[k] ?? null,
    setItem: (k: string, next: string) => {
      storageMap[k] = next;
    }
  });
  assert.equal(store.consumeResetReason(), "version_mismatch");
  assert.equal(store.consumeResetReason(), null);
  assert.equal(store.getResetReason(), null);
});

test("discardSession removes specific session by source and seed", () => {
  let storageMap: Record<string, string> = {};
  const mockStorage = {
    getItem: (k: string) => storageMap[k] ?? null,
    setItem: (k: string, v: string) => {
      storageMap[k] = v;
    }
  };

  const store = new QuizStore(mockStorage, false);
  const sessionA = { ...mockSession, sessionId: "s-1", seed: "seed-1" };
  const sessionB = { ...mockSession, sessionId: "s-2", seed: "seed-2" };

  store.saveSession(sessionA);
  store.saveSession(sessionB);
  assert.equal(store.getActiveSessions(mockSource).length, 2);

  store.discardSession(mockSource, "seed-1");
  const remaining = store.getActiveSessions(mockSource);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].seed, "seed-2");
});

test("saveAttempt is idempotent on sessionId and removes active session", () => {
  let storageMap: Record<string, string> = {};
  const mockStorage = {
    getItem: (k: string) => storageMap[k] ?? null,
    setItem: (k: string, v: string) => {
      storageMap[k] = v;
    }
  };

  const store = new QuizStore(mockStorage, false);
  store.saveSession(mockSession);
  assert.equal(store.getActiveSessions(mockSource).length, 1);

  const attempt: Attempt = {
    sessionId: "s-123",
    source: mockSource,
    seed: "seed-1",
    bankFingerprint: "fp",
    completedAt: "2026-01-01T01:00:00Z",
    score: 0,
    total: 1,
    questionResults: [
      {
        questionId: "q1",
        version: 1,
        topicIds: [],
        conceptIds: [],
        objectiveIds: [],
        answer: "wrong",
        correct: false,
        unanswered: false,
        uncertain: false
      }
    ]
  };

  // First save
  store.saveAttempt(attempt);
  assert.equal(store.getActiveSessions(mockSource).length, 0);
  assert.equal(store.getAttempts(mockSource).length, 1);
  assert.deepEqual(store.getWrongQuestionIds(), ["q1"]);

  // Duplicate save (idempotency check)
  store.saveAttempt(attempt);
  assert.equal(store.getAttempts(mockSource).length, 1);
  assert.deepEqual(store.getWrongQuestionIds(), ["q1"]);
});

test("deep storage guards reject malformed preferences, attempts, and sessions", () => {
  // Corrupt preferences
  const badPrefStorage = {
    getItem: () =>
      JSON.stringify({
        schemaVersion: 2,
        activeSessions: {},
        attempts: [],
        wrongQuestions: {},
        preferences: { restoreSession: "invalid" }
      }),
    setItem: () => {}
  };
  const store1 = new QuizStore(badPrefStorage);
  assert.equal(store1.getResetReason(), "corrupt_data");

  // Corrupt attempt: questionResults element is not a valid QuestionResult
  const badAttemptStorage = {
    getItem: () =>
      JSON.stringify({
        schemaVersion: 2,
        activeSessions: {},
        attempts: [
          {
            sessionId: "s1",
            source: mockSource,
            seed: "sd",
            bankFingerprint: "fp",
            completedAt: "2026-01-01T00:00:00Z",
            score: 1,
            total: 1,
            questionResults: [{ questionId: "q1", invalid: true }]
          }
        ],
        wrongQuestions: {},
        preferences: { restoreSession: true }
      }),
    setItem: () => {}
  };
  const store2 = new QuizStore(badAttemptStorage);
  assert.equal(store2.getResetReason(), "corrupt_data");

  // Corrupt session: uncertain map contains non-boolean value
  const badSessionStorage = {
    getItem: () =>
      JSON.stringify({
        schemaVersion: 2,
        activeSessions: {
          "set:mechanics.newton.quick": [
            {
              ...mockSession,
              uncertain: { q1: "not-a-boolean" }
            }
          ]
        },
        attempts: [],
        wrongQuestions: {},
        preferences: { restoreSession: true }
      }),
    setItem: () => {}
  };
  const store3 = new QuizStore(badSessionStorage);
  assert.equal(store3.getResetReason(), "corrupt_data");
});
