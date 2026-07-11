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
