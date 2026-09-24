import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

test("both submission scripts can share a page without redeclaring globals", () => {
  let activeForm = "general";
  const rendered = [];
  const widget = { innerHTML: "" };
  const context = {
    window: {},
    document$: { subscribe() {} },
    document: {
      getElementById(id) {
        if (id === "turnstile-widget") return widget;
        if (id === "plw-question-contribute-form" && activeForm === "question") return {};
        if (id === "submission-form" && activeForm === "general") return {};
        return null;
      },
    },
    turnstile: {
      render(selector, options) {
        rendered.push({ selector, options });
        return rendered.length;
      },
      remove() {},
    },
  };

  for (const filename of ["submit-form.js", "question-contribute.js"]) {
    const source = readFileSync(new URL(`../docs/_static/js/${filename}`, import.meta.url), "utf8");
    assert.doesNotThrow(() => runInNewContext(source, context, { filename }));
  }

  assert.equal(typeof context.window.onloadTurnstileCallback, "function");
  assert.doesNotThrow(() => context.window.onloadTurnstileCallback());
  activeForm = "question";
  assert.doesNotThrow(() => context.window.onloadTurnstileCallback());
  assert.equal(rendered.length, 2);
  assert.ok(rendered.every(item => item.selector === "#turnstile-widget"));
});
