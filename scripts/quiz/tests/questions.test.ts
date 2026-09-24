import assert from "node:assert/strict";
import test from "node:test";

import { readQuestionsParameters } from "../src/data.js";

test("readQuestionsParameters parses q param correctly", () => {
  const urlWithQ = new URL("https://example.com/quiz/questions/?q=mechanics-q-01");
  const params = readQuestionsParameters(urlWithQ);
  assert.equal(params.questionId, "mechanics-q-01");

  const urlWithoutQ = new URL("https://example.com/quiz/questions/");
  const paramsEmpty = readQuestionsParameters(urlWithoutQ);
  assert.equal(paramsEmpty.questionId, null);
});
