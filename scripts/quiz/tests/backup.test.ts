import assert from "node:assert/strict";
import test from "node:test";
import { createBackup, parseBackup, serializeBackup } from "../src/backup.js";
import { QuizStore, type LockLike } from "../src/storage.js";

const lock: LockLike = { request: async (_name, _options, callback) => callback() };
function memory() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    }
  };
}

test("backup roundtrip restores saved data with a new epoch", async () => {
  const store = new QuizStore(memory(), false, lock);
  const saved = await store.setSaved("q1", 1, true, "");
  assert.equal(saved.ok, true);
  const original = store.read();
  const raw = serializeBackup(createBackup(original, false));
  const parsed = parseBackup(raw, false);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  await store.setSaved("q2", 1, true, original.profileEpoch);
  const snapshot = store.read();
  const restored = await store.restoreProfile(parsed.backup.data, snapshot.profileEpoch, snapshot.revision);
  assert.equal(restored.ok, true);
  assert.deepEqual(Object.keys(store.read().library.savedQuestions), ["q1"]);
  assert.notEqual(store.read().profileEpoch, original.profileEpoch);
  assert.deepEqual(await store.setSaved("q3", 1, true, original.profileEpoch), { ok: false, reason: "stale_profile" });
});

test("restore requires the preview revision and rejects invalid or cross environment files", async () => {
  const store = new QuizStore(memory(), false, lock);
  await store.setSaved("q1", 1, true, "");
  const preview = store.read();
  const backup = createBackup(preview, false);
  assert.equal(parseBackup(serializeBackup(backup), true).ok, false);
  const dangerous = JSON.stringify({
    ...backup,
    data: {
      ...backup.data,
      library: { ...backup.data.library, collections: { __proto__: { id: "__proto__" } } }
    }
  }).replace('"collections":{}', '"collections":{"__proto__":{"id":"__proto__"}}');
  assert.equal(parseBackup(dangerous, false).ok, false);
  await store.setSaved("q2", 1, true, preview.profileEpoch);
  assert.deepEqual(await store.restoreProfile(backup.data, preview.profileEpoch, preview.revision), {
    ok: false,
    reason: "conflict"
  });
});
