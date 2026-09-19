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
    answer: {
      value: 9.8,
      tolerance: { type: "absolute", value: 0.05 },
      unit: { required: false, accepted: ["m/s^2"] },
    },
    solution: "地球表面附近重力加速度约为 9.8 m/s^2。",
  };
  assert.equal(validateQuestion(validNumeric), null);

  const missingTol = {
    type: "numeric",
    stem: "计算重力加速度大小：",
    answer: { value: 9.8 },
    solution: "解析：约为 9.8 m/s^2。",
  };
  assert.match(validateQuestion(missingTol), /数值题答案格式无效/);

  const invalidNumeric = {
    ...validNumeric,
    answer: {
      ...validNumeric.answer,
      value: NaN,
    },
  };
  assert.match(validateQuestion(invalidNumeric), /数值题答案无效/);
});

test("rejects unsafe Markdown, event handlers, and malformed image URLs", () => {
  assert.match(
    validateQuestion({ ...minimalDraftQuestion, stem: "<script>alert(1)</script>" }),
    /不安全/
  );
  assert.match(
    validateQuestion({ ...minimalDraftQuestion, stem: '<img src="x" onerror="alert(1)">' }),
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

test("rejects invalid choice IDs or excessive choices", () => {
  const lowercaseChoiceId = {
    ...fullChoiceQuestion,
    choices: [
      { id: "a", content: "小写A" },
      { id: "B", content: "大写B" },
    ],
    answer: { choice: "B" },
  };
  assert.match(validateQuestion(lowercaseChoiceId), /选项 ID 无效/);

  const tooManyChoices = {
    ...fullChoiceQuestion,
    choices: ["A", "B", "C", "D", "E", "F", "G"].map(id => ({ id, content: `选项 ${id}` })),
    answer: { choice: "A" },
  };
  assert.match(validateQuestion(tooManyChoices), /选项数量无效/);
});

test("enforces multiple choice question and answer constraints strictly", () => {
  const mcQuestion = {
    type: "multiple_choice",
    stem: "下列属于理想化物理模型的是：",
    choices: [
      { id: "A", content: "质点" },
      { id: "B", content: "刚体" },
      { id: "C", content: "点电荷" },
    ],
    answer: { choices: ["A", "B"] },
    solution: "质点、刚体和点电荷均为物理理想模型。",
  };
  assert.equal(validateQuestion(mcQuestion), null);

  // Less than 3 choices in multiple_choice rejected
  const mcFewChoices = {
    ...mcQuestion,
    choices: [
      { id: "A", content: "质点" },
      { id: "B", content: "刚体" },
    ],
  };
  assert.match(validateQuestion(mcFewChoices), /多选需 3 到 8 个/);

  // Less than 2 answer choices in multiple_choice rejected
  const mcSingleAns = {
    ...mcQuestion,
    answer: { choices: ["A"] },
  };
  assert.match(validateQuestion(mcSingleAns), /至少需包含 2 个有效选项/);

  // Duplicate answer choices rejected
  const mcDuplicateAns = {
    ...mcQuestion,
    answer: { choices: ["A", "A"] },
  };
  assert.match(validateQuestion(mcDuplicateAns), /多选题答案不能包含重复选项/);
});

test("validates numeric tolerance and unit strictly", () => {
  const validFullNumeric = {
    type: "numeric",
    stem: "计算重力加速度大小：",
    answer: {
      value: 9.8,
      tolerance: { type: "absolute", value: 0.05 },
      unit: { required: true, accepted: ["m/s^2", "N/kg"], canonical: "m/s^2" },
    },
    solution: "解析：约为 9.8 m/s^2。",
  };
  assert.equal(validateQuestion(validFullNumeric), null);

  const invalidTolType = {
    ...validFullNumeric,
    answer: {
      ...validFullNumeric.answer,
      tolerance: { type: "percent", value: 0.05 },
    },
  };
  assert.match(validateQuestion(invalidTolType), /容差类型无效/);

  const outOfBoundsTol = {
    ...validFullNumeric,
    answer: {
      ...validFullNumeric.answer,
      tolerance: { type: "relative", value: 1.5 },
    },
  };
  assert.match(validateQuestion(outOfBoundsTol), /容差值无效/);

  const zeroWithRelative = {
    ...validFullNumeric,
    answer: {
      value: 0,
      tolerance: { type: "relative", value: 0.05 },
      unit: { required: false, accepted: [] },
    },
  };
  assert.match(validateQuestion(zeroWithRelative), /真值为 0 时容差类型必须为绝对容差/);

  const invalidUnit = {
    ...validFullNumeric,
    answer: {
      ...validFullNumeric.answer,
      unit: { required: "yes", accepted: [] },
    },
  };
  assert.match(validateQuestion(invalidUnit), /单位定义无效/);

  const missingCanonical = {
    ...validFullNumeric,
    answer: {
      ...validFullNumeric.answer,
      unit: { required: true, accepted: ["m/s^2"], canonical: "N/kg" },
    },
  };
  assert.match(validateQuestion(missingCanonical), /规范单位必须包含在可接受单位列表中/);
});

test("validates dotted taxonomy ID format for topics and concepts", () => {
  const badTopic = {
    ...fullChoiceQuestion,
    topics: ["INVALID_TOPIC"],
  };
  assert.match(validateQuestion(badTopic), /主题分类格式无效/);

  const badConcept = {
    ...fullChoiceQuestion,
    concepts: ["Invalid.Concept!"],
  };
  assert.match(validateQuestion(badConcept), /概念分类格式无效/);
});

import fs from "node:fs";

const contractFixture = JSON.parse(
  fs.readFileSync(new URL("../tests/question_bank/fixtures/submission_v2_contract.json", import.meta.url), "utf-8")
);

test("accepts all valid question payloads from submission_v2_contract fixture", () => {
  for (const [name, q] of Object.entries(contractFixture.valid)) {
    const error = validateQuestion(q);
    assert.equal(error, null, `Expected valid ${name} to pass, got error: ${error}`);
  }
});

test("rejects all invalid question payloads from submission_v2_contract fixture", () => {
  for (const [name, inv] of Object.entries(contractFixture.invalid)) {
    const baseObj = contractFixture.valid[inv.base];
    const testObj = { ...baseObj, ...inv.override };
    const error = validateQuestion(testObj);
    assert.notEqual(error, null, `Expected invalid ${name} to be rejected, but it passed`);
  }
});


