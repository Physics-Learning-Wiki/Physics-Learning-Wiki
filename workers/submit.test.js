import assert from "node:assert/strict";
import test from "node:test";

import { buildIssueBody, validateQuestion } from "./submit.js";

const minimalDraftQuestion = {
  type: "true_false",
  stem: "匀速直线运动的物体合外力一定为零。",
  answer: { value: true },
  solution: "根据牛顿第一定律，合外力为零时物体保持静止或匀速直线运动。",
};

const fullChoiceQuestion = {
  type: "single_choice",
  stem: "关于惯性，下列说法正确的是：",
  choices: [
    { id: "A", content: "物体只有静止或匀速运动时才有惯性" },
    { id: "B", content: "质量是物体惯性大小的唯一量度" },
    { id: "C", content: "速度越大的物体惯性越大" },
  ],
  answer: { choice: "B" },
  feedback: {
    choices: {
      A: "错误，任何物体在任何状态下都有惯性",
      B: "正确，质量是惯性的唯一量度",
      C: "错误，惯性与速度无关",
    },
    correct: "回答正确！",
    incorrect: "回答错误，请回顾质量与惯性的关系。",
  },
  solution: "质量是衡量物体惯性大小的物理量，与物体所处的状态或速度无关。",
  topics: ["mechanics.dynamics"],
  concepts: ["mechanics.newton.inertia"],
  difficulty: 1,
  cognitive_level: "understand",
  style: "conceptual",
  estimated_seconds: 45,
};

test("accepts minimal valid draft question payload", () => {
  assert.equal(validateQuestion(minimalDraftQuestion), null);
});

test("accepts question with valid optional metadata", () => {
  assert.equal(validateQuestion(fullChoiceQuestion), null);
});

test("rejects inconsistent choice feedback", () => {
  const badFeedback = {
    ...fullChoiceQuestion,
    feedback: {
      ...fullChoiceQuestion.feedback,
      choices: { A: "只有一项" },
    },
  };
  assert.match(validateQuestion(badFeedback), /逐项反馈/);
});

test("rejects choices mismatch in answers", () => {
  const badAnswer = {
    ...fullChoiceQuestion,
    answer: { choice: "D" },
  };
  assert.match(validateQuestion(badAnswer), /单选题答案与选项不一致/);
});

test("validates numeric answers requiring finite numbers", () => {
  const validNumeric = {
    type: "numeric",
    stem: "计算重力加速度大小（单位取 m/s^2）：",
    answer: { value: 9.8 },
    solution: "地球表面附近重力加速度约为 9.8 m/s^2。",
  };
  assert.equal(validateQuestion(validNumeric), null);

  const invalidNumeric = {
    ...validNumeric,
    answer: { value: NaN },
  };
  assert.match(validateQuestion(invalidNumeric), /数值题答案无效/);
});

test("rejects unsafe Markdown and malformed image URLs", () => {
  assert.match(
    validateQuestion({ ...minimalDraftQuestion, stem: "<script>alert(1)</script>" }),
    /不安全/
  );
  assert.match(
    validateQuestion({
      ...minimalDraftQuestion,
      external_media: [{ url: "http://insecure.example/img.png", alt: "图", rights_note: "原创" }],
    }),
    /图片链接/
  );
});

test("embeds a versioned machine-readable payload (v2)", () => {
  const body = buildIssueBody({
    type: "question",
    typeLabel: "题目投稿",
    content: minimalDraftQuestion.stem,
    question: minimalDraftQuestion,
  });
  assert.match(body, /plw-question-submission-v2/);
  assert.match(body, /"schemaVersion":2/);
  assert.doesNotMatch(body, /页面 ID/);
  assert.doesNotMatch(body, /主要学习目标/);
});
