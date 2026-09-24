import assert from "node:assert/strict";
import { test } from "node:test";
import { createAbortScope } from "../src/abort-scope.js";

test("abort scopes follow their parent and can release the parent listener", () => {
  const parent = new AbortController();
  const child = createAbortScope(parent.signal);
  parent.abort();
  assert.equal(child.controller.signal.aborted, true);
  child.release();

  const detachedParent = new AbortController();
  const detachedChild = createAbortScope(detachedParent.signal);
  detachedChild.release();
  detachedParent.abort();
  assert.equal(detachedChild.controller.signal.aborted, false);
});
