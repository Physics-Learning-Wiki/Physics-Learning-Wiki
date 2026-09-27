import assert from "node:assert/strict";
import test from "node:test";
import { formatAiPrompt, formatQuestionMarkdown } from "../src/question-copy.js";
import type { Question } from "../src/types.js";

const question: Question = {
  id: "q1",
  version: 1,
  status: "published",
  type: "single_choice",
  choiceOrder: "fixed",
  topicIds: [],
  conceptIds: [],
  objectiveIds: [],
  relatedPages: [],
  stemHtml: "<p>hidden</p>",
  hintsHtml: [],
  solutionHtml: "官方解析不能复制",
  assets: { diagram: "assets/a.svg" },
  source: {
    stemMarkdown: "求 $F=ma$：![图](asset:diagram)",
    choices: [
      { id: "A", contentMarkdown: "选择 $a$" },
      { id: "B", contentMarkdown: "选择 $b$" }
    ]
  },
  choices: [
    { id: "A", contentHtml: "选择 a" },
    { id: "B", contentHtml: "选择 b" }
  ],
  answer: { choice: "A" }
};

test("copy format preserves markdown, resolves assets from manifest and excludes answer", () => {
  const url = new URL("https://example.org/wiki/_generated/question-bank/manifest.json");
  const result = formatQuestionMarkdown(question, url);
  assert.match(result, /\$F=ma\$/);
  assert.match(result, /https:\/\/example.org\/wiki\/_generated\/question-bank\/assets\/a.svg/);
  assert.match(result, /A\. 选择 \$a\$/);
  assert.ok(!result.includes("官方解析"));
  assert.ok(!result.includes("hidden"));
  const prompt = formatAiPrompt(question, url, "我的尝试");
  assert.ok(prompt.includes("我的尝试"));
  assert.ok(!prompt.includes("官方解析"));
});
