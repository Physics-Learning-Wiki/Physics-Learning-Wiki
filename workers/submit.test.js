import assert from "node:assert/strict";
import test from "node:test";

import { buildIssueBody, validateQuestion } from "./submit.js";

const question = {
  page_id: "mechanics.dynamics.newton-laws",
  primary_objective: "mech.dyn.newton.first-law",
  secondary_objectives: [],
  concepts: ["newton.inertia"],
  type: "single_choice",
  choice_order: "shuffle",
  stem: "题干",
  choices: [
    { id: "A", content: "正确" },
    { id: "B", content: "错误" },
  ],
  answer: { choice: "A" },
  feedback: {
    choices: { A: "正确反馈", B: "错误反馈" },
    correct: "答对",
    incorrect: "答错",
  },
  solution: "完整解析",
  hints: [],
  difficulty: 1,
  cognitive_level: "understand",
  style: "conceptual",
  estimated_seconds: 30,
};

test("accepts a complete structured question", () => {
  assert.equal(validateQuestion(question), null);
});

test("rejects inconsistent choice feedback", () => {
  assert.match(validateQuestion({ ...question, feedback: { ...question.feedback, choices: { A: "只有一项" } } }), /逐项反馈/);
});

test("rejects unsafe Markdown and malformed image URLs", () => {
  assert.match(validateQuestion({ ...question, stem: "<script>alert(1)</script>" }), /不安全/);
  assert.match(
    validateQuestion({
      ...question,
      external_media: [{ url: "https://", alt: "图", rights_note: "原创" }],
    }),
    /图片链接/
  );
});

test("embeds a versioned machine-readable payload", () => {
  const body = buildIssueBody({
    type: "question",
    typeLabel: "题目投稿",
    content: question.stem,
    question,
  });
  assert.match(body, /plw-question-submission-v1/);
  assert.match(body, /"schemaVersion":1/);
});
