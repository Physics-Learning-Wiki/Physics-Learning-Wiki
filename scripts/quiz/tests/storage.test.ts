import assert from "node:assert/strict";
import test from "node:test";
import { QuizStore, STORAGE_KEY_PROD, LEGACY_KEY_PROD, type LockLike } from "../src/storage.js";
import type { Attempt, QuestionResult, Session } from "../src/types.js";

class MemoryStorage {
  data = new Map<string, string>();
  fail = false;
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.fail) throw new Error("quota");
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}
class Lock implements LockLike {
  private queue = Promise.resolve();
  request<T>(_name: string, _options: { mode: "exclusive" }, callback: () => Promise<T>): Promise<T> {
    const next = this.queue.then(callback);
    this.queue = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }
}
const source = { type: "set" as const, id: "set-a" };
const wrong: QuestionResult = {
  questionId: "q1",
  version: 1,
  topicIds: [],
  conceptIds: [],
  objectiveIds: [],
  answer: "B",
  correct: false,
  unanswered: false,
  uncertain: false,
  evaluation: { mode: "automatic", status: "incorrect", score: 0, maxScore: 1 }
};
const unanswered: QuestionResult = {
  ...wrong,
  answer: null,
  unanswered: true,
  evaluation: { mode: "automatic", status: "unanswered", score: 0, maxScore: 1 }
};
function session(id = "s1"): Session {
  return {
    sessionId: id,
    profileEpoch: "",
    sessionRevision: 0,
    committedResults: {},
    preview: false,
    selectionAlgorithmVersion: 1,
    state: "active",
    source,
    seed: id,
    bankFingerprint: "fp",
    questionRefs: [{ id: "q1", version: 1 }],
    answers: {},
    uncertain: {},
    locked: {},
    currentIndex: 0,
    startedAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z"
  };
}
function attempt(id: string, result = wrong): Attempt {
  return {
    sessionId: id,
    source,
    seed: id,
    bankFingerprint: "fp",
    completedAt: "2026-01-01T01:00:00Z",
    score: 0,
    total: 1,
    questionResults: [result]
  };
}

test("new profile is created only on first committed write", async () => {
  const storage = new MemoryStorage();
  const store = new QuizStore(storage, false, new Lock());
  await store.ready();
  assert.equal(store.read().profileEpoch, "");
  assert.equal(storage.getItem(STORAGE_KEY_PROD), null);
  const created = await store.createSession(session(), 0);
  assert.equal(created.ok, true);
  assert.equal(store.read().revision, 1);
  assert.ok(store.read().profileEpoch);
});

test("damaged and future data stay untouched and read only", async () => {
  for (const raw of ["{broken", JSON.stringify({ schemaVersion: 4 })]) {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY_PROD, raw);
    const store = new QuizStore(storage, false, new Lock());
    await store.ready();
    assert.equal(store.getStatus(), raw === "{broken" ? "corrupt_data" : "version_mismatch");
    assert.deepEqual(await store.createSession(session(), 0), { ok: false, reason: "read_only" });
    assert.equal(storage.getItem(STORAGE_KEY_PROD), raw);
  }
});

test("valid v2 migrates with partial history and preserves legacy wrong evidence", async () => {
  const storage = new MemoryStorage();
  const old = session();
  const { profileEpoch, sessionRevision, committedResults, ...legacySession } = old;
  storage.setItem(
    LEGACY_KEY_PROD,
    JSON.stringify({
      schemaVersion: 2,
      activeSessions: { "set:set-a": [legacySession] },
      attempts: [],
      wrongQuestions: { q2: "2025-01-01T00:00:00Z" },
      preferences: { restoreSession: true }
    })
  );
  const store = new QuizStore(storage, false, new Lock());
  await store.ready();
  assert.equal(store.getStatus(), "ready");
  assert.equal(store.read().learning.historyCoverage, "partial_legacy");
  assert.equal(store.read().learning.questions.q2.incorrectCount, 0);
  assert.equal(store.read().learning.questions.q2.wrongBook?.legacyImported, true);
  assert.equal(store.getActiveSessions(source).length, 1);
  assert.equal(storage.getItem(LEGACY_KEY_PROD), null);
});

test("failed write leaves stored data and memory unchanged", async () => {
  const storage = new MemoryStorage();
  const store = new QuizStore(storage, false, new Lock());
  const created = await store.createSession(session(), 0);
  assert.equal(created.ok, true);
  const before = storage.getItem(STORAGE_KEY_PROD);
  storage.fail = true;
  const updated = await store.updateSession({ ...(created as { ok: true; value: Session }).value, currentIndex: 1 });
  assert.equal(updated.ok, false);
  assert.equal(storage.getItem(STORAGE_KEY_PROD), before);
  assert.equal(store.read().revision, 1);
});

test("committed result survives exit and completion never counts it twice", async () => {
  const store = new QuizStore(new MemoryStorage(), false, new Lock());
  const created = await store.createSession(session(), 0);
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const committed = await store.commitQuestion(created.value, wrong);
  assert.equal(committed.ok, true);
  if (!committed.ok) return;
  assert.equal(store.read().learning.questions.q1.incorrectCount, 1);
  const completed = await store.completeSession(committed.value, attempt("s1"));
  assert.equal(completed.ok, true);
  assert.equal(store.read().learning.questions.q1.incorrectCount, 1);
  assert.deepEqual(await store.completeSession(committed.value, attempt("s1")), {
    ok: false,
    reason: "session_missing"
  });
});

test("unanswered and uncertain flags do not create wrong book entries", async () => {
  const store = new QuizStore(new MemoryStorage(), false, new Lock());
  const created = await store.createSession(session(), 0);
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const completed = await store.completeSession(created.value, attempt("s1", { ...unanswered, uncertain: true }));
  assert.equal(completed.ok, true);
  assert.deepEqual(store.getWrongQuestionIds(), []);
});

test("two stores serialize independent favorites and reject stale epochs", async () => {
  const storage = new MemoryStorage();
  const lock = new Lock();
  const a = new QuizStore(storage, false, lock);
  const b = new QuizStore(storage, false, lock);
  await Promise.all([a.ready(), b.ready()]);
  const first = await a.setSaved("q1", 1, true, "");
  assert.equal(first.ok, true);
  const oldEpoch = a.read().profileEpoch;
  const results = await Promise.all([a.setSaved("q2", 1, true, oldEpoch), b.setSaved("q3", 1, true, oldEpoch)]);
  assert.ok(results.every(result => result.ok));
  assert.deepEqual(Object.keys(JSON.parse(storage.getItem(STORAGE_KEY_PROD)!).library.savedQuestions).sort(), [
    "q1",
    "q2",
    "q3"
  ]);
  assert.deepEqual(await a.setSaved("q4", 1, true, "old-epoch"), { ok: false, reason: "stale_profile" });
});
