import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

test("both submission scripts can share a page without redeclaring globals", () => {
  const context = {
    window: {},
    document$: { subscribe() {} },
    document: { getElementById() { return null; } },
  };

  for (const filename of ["submit-form.js", "question-contribute.js"]) {
    const source = readFileSync(new URL(`../docs/_static/js/${filename}`, import.meta.url), "utf8");
    assert.doesNotThrow(() => runInNewContext(source, context, { filename }));
  }

  assert.equal(typeof context.window.onloadTurnstileCallback, "function");
  assert.doesNotThrow(() => context.window.onloadTurnstileCallback());
});
