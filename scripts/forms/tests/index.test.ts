import assert from "node:assert/strict";
import { test } from "node:test";

import { parsePairs } from "../src/parse-pairs.js";
import { parseDraft, sameDraft, type SubmissionDraft } from "../src/draft.js";

test("question submission option parsing is case-insensitive and rejects invalid pairs", () => {
  assert.deepEqual(parsePairs("a | left\nB|right", "选项"), { A: "left", B: "right" });
  assert.throws(() => parsePairs("A|left\na|duplicate", "选项"), /重复/);
  assert.throws(() => parsePairs("A|", "选项"), /格式应为/);
});

test("draft recovery rejects malformed or incompatible data and keeps only allowed fields", () => {
  const value: SubmissionDraft = {
    schemaVersion: 1,
    type: "notes",
    title: "复习",
    content: "正文",
    majorChapter: "经典力学",
    minorChapter: "经典力学 > 质点动力学",
    updatedAt: 100
  };
  assert.deepEqual(
    parseDraft(JSON.stringify({ ...value, contact: "private", attribution: "name", turnstileToken: "token" })),
    value
  );
  for (const raw of [
    "{",
    "null",
    JSON.stringify({ ...value, schemaVersion: 2 }),
    JSON.stringify({ ...value, content: 42 }),
    JSON.stringify({ ...value, type: "invalid" })
  ])
    assert.equal(parseDraft(raw), undefined);
  assert.equal(sameDraft(value, { ...value, updatedAt: 200 }), true);
  assert.equal(sameDraft(value, { ...value, content: "新正文" }), false);
});
