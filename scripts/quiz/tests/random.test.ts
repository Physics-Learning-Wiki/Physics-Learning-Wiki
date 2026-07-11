import assert from "node:assert/strict";
import test from "node:test";

import { shuffle } from "../src/random.js";

test("seeded shuffle is deterministic and immutable", () => {
  const input = [1, 2, 3, 4, 5];
  assert.deepEqual(shuffle(input, "same"), shuffle(input, "same"));
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
  assert.notDeepEqual(shuffle(input, "same"), shuffle(input, "different"));
});
