import assert from "node:assert/strict";
import test from "node:test";

import { QuizStore } from "../src/storage.js";

test("storage failure degrades to memory", () => {
  const store = new QuizStore({
    getItem: () => null,
    setItem: () => {
      throw new Error("blocked");
    }
  });
  assert.equal(store.persistent, false);
  assert.equal(store.read().schemaVersion, 1);
});

test("unknown storage versions reset safely", () => {
  let value = JSON.stringify({ schemaVersion: 99 });
  const store = new QuizStore({
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    }
  });
  assert.equal(store.read().schemaVersion, 1);
});

test("discardSession removes specific session", () => {
  let value = "";
  const store = new QuizStore({
    getItem: () => value || null,
    setItem: (_key, next) => {
      value = next;
    }
  });
  const sessionA = {
    pageId: "page-1",
    mode: "quick" as const,
    seed: "seed-1",
    bankFingerprint: "fp",
    questionRefs: [],
    answers: {},
    uncertain: {},
    locked: {},
    currentIndex: 0,
    startedAt: "",
    updatedAt: ""
  };
  const sessionB = {
    ...sessionA,
    mode: "full" as const,
    seed: "seed-2"
  };
  store.saveSession(sessionA);
  store.saveSession(sessionB);
  assert.equal(store.read().activeSessions["page-1"]?.length, 2);

  store.discardSession("page-1", "quick", "seed-1");
  const remaining = store.read().activeSessions["page-1"];
  assert.equal(remaining?.length, 1);
  assert.equal(remaining[0].seed, "seed-2");
});
