import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import submitWorker, { buildIssueBody, validateQuestion, unsafeMarkdown } from "./submit.js";

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
  concepts: ["newton.inertia"],
  difficulty: 1,
  cognitive_level: "understand",
  style: "conceptual",
  estimated_seconds: 45,
};

test("accepts minimal valid draft question payload", () => {
  assert.equal(validateQuestion(minimalDraftQuestion), null);
});

test("accepts a free-response self-assessment payload", () => {
  assert.equal(
    validateQuestion({
      type: "free_response",
      stem: "解释牛顿第二定律。",
      response: { format: "plain_text", required: true, max_chars: 2000 },
      grading: {
        mode: "self_assessed",
        rubric: [
          { id: "partial", label: "部分掌握", points: 0.5 },
          { id: "complete", label: "基本掌握", points: 1 },
        ],
      },
      reference_answer: "合外力等于质量乘以加速度。",
      solution: "同时检查适用条件。",
    }),
    null
  );
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

// ==========================================
// Security & Resilience Regression Tests (S-01 to S-12)
// ==========================================

test("S-01 & S-08: unsafeMarkdown rejects non-strings and snippets syntax", () => {
  assert.equal(unsafeMarkdown(null), true);
  assert.equal(unsafeMarkdown(undefined), true);
  assert.equal(unsafeMarkdown(["<script>"]), true);
  assert.equal(unsafeMarkdown({ key: "val" }), true);
  assert.equal(unsafeMarkdown('--8<-- "data/concepts.yml"'), true);
  assert.equal(unsafeMarkdown("<style>body{color:red}</style>"), true);
  assert.equal(unsafeMarkdown('<link rel="stylesheet" href="evil.css">'), true);
  assert.equal(unsafeMarkdown("标准物理正文与公式 $F=ma$ 应该安全通过"), false);
});

test("S-08: validateQuestion enforces budget bounds on hints, topics, concepts", () => {
  const excessiveHints = {
    ...minimalDraftQuestion,
    hints: ["提示1", "提示2", "提示3", "提示4", "提示5", "提示6"],
  };
  assert.match(validateQuestion(excessiveHints), /最多 5 条/);

  const excessiveTopics = {
    ...fullChoiceQuestion,
    topics: ["t.1", "t.2", "t.3", "t.4", "t.5", "t.6"],
  };
  assert.match(validateQuestion(excessiveTopics), /最多 5 项/);

  const excessiveConcepts = {
    ...fullChoiceQuestion,
    concepts: ["c.1", "c.2", "c.3", "c.4", "c.5", "c.6", "c.7", "c.8", "c.9", "c.10", "c.11"],
  };
  assert.match(validateQuestion(excessiveConcepts), /最多 10 项/);
});

function createMockEnv(overrides = {}) {
  return {
    TURNSTILE_SECRET_KEY: "mock-secret-key",
    GITHUB_TOKEN: "mock-gh-token",
    ...overrides,
  };
}

function createRequest(body, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const rawBody = typeof body === "string" ? body : JSON.stringify(body);
  const req = new Request("https://worker.test/submit", {
    method: options.method || "POST",
    headers,
    body: options.method === "OPTIONS" || options.method === "GET" ? undefined : rawBody,
  });
  if (options.omitContentLength) {
    req.headers.delete("content-length");
  }
  return req;
}

test("S-01 & S-08: worker entry rejects non-POST and oversized requests", async () => {
  const getRes = await submitWorker.fetch(createRequest({}, { method: "GET" }), createMockEnv());
  assert.equal(getRes.status, 405);

  const largeRes = await submitWorker.fetch(
    createRequest({}, { headers: { "Content-Length": "200000" } }),
    createMockEnv()
  );
  assert.equal(largeRes.status, 413);

  // P1-2: Oversized request without Content-Length header is blocked via bounded stream reading
  const oversizedNoHeaderRes = await submitWorker.fetch(
    createRequest({ title: "大请求", content: "x".repeat(140000), type: "notes" }, { omitContentLength: true }),
    createMockEnv()
  );
  assert.equal(oversizedNoHeaderRes.status, 413);
  const dataOver = await oversizedNoHeaderRes.json();
  assert.match(dataOver.error, /体积限制/);

  const malformedJsonRes = await submitWorker.fetch(
    createRequest("{ not a valid json }"),
    createMockEnv()
  );
  assert.equal(malformedJsonRes.status, 400);

  const arrayBodyRes = await submitWorker.fetch(
    createRequest(["item1", "item2"]),
    createMockEnv()
  );
  assert.equal(arrayBodyRes.status, 400);
});

test("S-01: worker entry rejects unknown top-level keys", async () => {
  const res = await submitWorker.fetch(
    createRequest({
      title: "正常标题",
      content: "正常内容",
      type: "notes",
      turnstileToken: "tok",
      maliciousExtraProperty: "injected",
    }),
    createMockEnv()
  );
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /不支持的未知顶层字段/);
});

test("S-01: worker entry blocks type-spoofing attacks (array content or object title)", async () => {
  // Attack: array content bypassing unsafeMarkdown check
  const arrayContentRes = await submitWorker.fetch(
    createRequest({
      title: "标题",
      content: ["<script>alert('xss')</script>"],
      type: "notes",
      turnstileToken: "tok",
    }),
    createMockEnv()
  );
  assert.equal(arrayContentRes.status, 400);
  const data1 = await arrayContentRes.json();
  assert.match(data1.error, /缺少必填字符串字段/);

  // Attack: object title bypassing length comparison
  const objTitleRes = await submitWorker.fetch(
    createRequest({
      title: { value: "注入标题" },
      content: "正文内容",
      type: "notes",
      turnstileToken: "tok",
    }),
    createMockEnv()
  );
  assert.equal(objTitleRes.status, 400);

  // Attack: multiline title to inject Issue headers
  const multilineTitleRes = await submitWorker.fetch(
    createRequest({
      title: "第一行标题\n## 虚假注入标题",
      content: "正文内容",
      type: "notes",
      turnstileToken: "tok",
    }),
    createMockEnv()
  );
  assert.equal(multilineTitleRes.status, 400);
  const data3 = await multilineTitleRes.json();
  assert.match(data3.error, /换行符/);
});

test("S-09: worker entry enforces licenseConsent for question submissions", async () => {
  const missingConsentRes = await submitWorker.fetch(
    createRequest({
      title: "物理题目",
      content: minimalDraftQuestion.stem,
      type: "question",
      question: minimalDraftQuestion,
      turnstileToken: "tok",
    }),
    createMockEnv()
  );
  assert.equal(missingConsentRes.status, 400);
  const data = await missingConsentRes.json();
  assert.match(data.error, /CC BY-SA 4.0/);
});

test("S-07 & S-06: worker handles Turnstile failures, hostnames, and GitHub errors securely", async () => {
  const originalFetch = globalThis.fetch;
  try {
    // 1. Mock Turnstile failure
    globalThis.fetch = async (url) => {
      if (String(url).includes("challenges.cloudflare.com")) {
        return new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return originalFetch(url);
    };

    const failTurnstileRes = await submitWorker.fetch(
      createRequest({
        title: "普通标题",
        content: "正文内容",
        type: "notes",
        turnstileToken: "bad-token",
      }),
      createMockEnv()
    );
    assert.equal(failTurnstileRes.status, 400);
    const data1 = await failTurnstileRes.json();
    assert.match(data1.error, /人机验证失败/);

    // 2. Mock Turnstile hostname mismatch
    globalThis.fetch = async (url) => {
      if (String(url).includes("challenges.cloudflare.com")) {
        return new Response(
          JSON.stringify({ success: true, hostname: "evil-phishing.com", action: "submit-general" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return originalFetch(url);
    };

    const badHostRes = await submitWorker.fetch(
      createRequest({
        title: "普通标题",
        content: "正文内容",
        type: "notes",
        turnstileToken: "valid-tok",
      }),
      createMockEnv()
    );
    assert.equal(badHostRes.status, 400);
    const data2 = await badHostRes.json();
    assert.match(data2.error, /主机名无效/);

    // 3. Mock Turnstile timeout / network error
    globalThis.fetch = async (url) => {
      if (String(url).includes("challenges.cloudflare.com")) {
        throw new Error("Network timeout connecting to Turnstile");
      }
      return originalFetch(url);
    };

    const timeoutRes = await submitWorker.fetch(
      createRequest({
        title: "普通标题",
        content: "正文内容",
        type: "notes",
        turnstileToken: "valid-tok",
      }),
      createMockEnv()
    );
    assert.equal(timeoutRes.status, 502);

    // 4. Mock GitHub API failure without leaking token
    globalThis.fetch = async (url) => {
      if (String(url).includes("challenges.cloudflare.com")) {
        return new Response(
          JSON.stringify({ success: true, hostname: "physics-learning-wiki.github.io", action: "submit-general" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (String(url).includes("api.github.com")) {
        return new Response("Bad credentials - token mock-gh-token is invalid", {
          status: 401,
          headers: { "Content-Type": "text/plain" },
        });
      }
      return originalFetch(url);
    };

    const ghErrorRes = await submitWorker.fetch(
      createRequest({
        title: "普通标题",
        content: "正文内容",
        type: "notes",
        turnstileToken: "valid-tok",
      }),
      createMockEnv()
    );
    assert.equal(ghErrorRes.status, 502);
    const data3 = await ghErrorRes.json();
    assert.equal(data3.error, "创建 Issue 失败，请稍后重试");
    // Ensure raw token text is never reflected in response
    assert.doesNotMatch(JSON.stringify(data3), /mock-gh-token/);

    // 5. Successful submission
    globalThis.fetch = async (url) => {
      if (String(url).includes("challenges.cloudflare.com")) {
        return new Response(
          JSON.stringify({ success: true, hostname: "physics-learning-wiki.github.io", action: "submit-general" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (String(url).includes("api.github.com")) {
        return new Response(
          JSON.stringify({
            html_url: "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/123",
            number: 123,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      return originalFetch(url);
    };

    const successRes = await submitWorker.fetch(
      createRequest({
        title: "合法的勘误投稿",
        content: "发现第 3 节有一处符号笔误．",
        type: "errata",
        attribution: "爱因斯坦",
        turnstileToken: "valid-tok",
      }),
      createMockEnv()
    );
    assert.equal(successRes.status, 200);
    const data4 = await successRes.json();
    assert.equal(data4.success, true);
    assert.equal(data4.issueNumber, 123);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("P0-1: worker entry rejects HTML or dangerous tags in metadata fields", async () => {
  const attackPayloads = [
    { attribution: '<img src=x onerror=alert("xss")>' },
    { attribution: '<script>alert(1)</script>' },
    { chapter: '<iframe src="https://evil.com"></iframe>' },
    { typeLabel: '<svg onload=alert(1)>' },
    { contact: '<a href="javascript:alert(1)">点我</a>', contactPublicConsent: true },
    { title: "包含<script>标签的标题" },
  ];

  for (const extra of attackPayloads) {
    const res = await submitWorker.fetch(
      createRequest({
        title: "正常标题",
        content: "正文内容",
        type: "notes",
        turnstileToken: "tok",
        ...extra,
      }),
      createMockEnv()
    );
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /HTML 标签|不安全字符/);
  }

  // Question submission with HTML in question.attribution or question.ai_name
  for (const qExtra of [
    { attribution: '<img src=x onerror=alert("xss")>' },
    { attribution: '<script>alert(1)</script>' },
    { ai_assisted: true, ai_name: '<svg onload=alert(1)>' },
    { ai_assisted: true, ai_name: '<iframe src="evil.com"></iframe>' },
  ]) {
    const res = await submitWorker.fetch(
      createRequest({
        title: "题目投稿",
        content: minimalDraftQuestion.stem,
        type: "question",
        question: { ...minimalDraftQuestion, ...qExtra },
        licenseConsent: true,
        turnstileToken: "tok",
      }),
      createMockEnv()
    );
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /HTML 标签|不安全/);
  }
});

test("P1-1: worker strictly enforces Turnstile action and hostname fail-closed", async () => {
  const originalFetch = globalThis.fetch;
  try {
    // 1. Missing hostname in Turnstile response -> 400
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ success: true, action: "submit-general" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    const missingHostRes = await submitWorker.fetch(
      createRequest({ title: "标题", content: "正文内容", type: "notes", turnstileToken: "tok" }),
      createMockEnv()
    );
    assert.equal(missingHostRes.status, 400);
    assert.match((await missingHostRes.json()).error, /主机名无效/);

    // 2. Missing action in Turnstile response -> 400
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ success: true, hostname: "physics-learning-wiki.github.io" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    const missingActionRes = await submitWorker.fetch(
      createRequest({ title: "标题", content: "正文内容", type: "notes", turnstileToken: "tok" }),
      createMockEnv()
    );
    assert.equal(missingActionRes.status, 400);
    assert.match((await missingActionRes.json()).error, /业务行为不匹配/);

    // 3. Action mismatch: question submission with submit-general action -> 400
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ success: true, hostname: "physics-learning-wiki.github.io", action: "submit-general" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    const actionMismatchRes1 = await submitWorker.fetch(
      createRequest({
        title: "题目",
        content: minimalDraftQuestion.stem,
        type: "question",
        question: minimalDraftQuestion,
        licenseConsent: true,
        turnstileToken: "tok",
      }),
      createMockEnv()
    );
    assert.equal(actionMismatchRes1.status, 400);
    assert.match((await actionMismatchRes1.json()).error, /业务行为不匹配/);

    // 4. Action mismatch: notes submission with submit-question action -> 400
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ success: true, hostname: "physics-learning-wiki.github.io", action: "submit-question" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    const actionMismatchRes2 = await submitWorker.fetch(
      createRequest({ title: "笔记", content: "正文内容", type: "notes", turnstileToken: "tok" }),
      createMockEnv()
    );
    assert.equal(actionMismatchRes2.status, 400);
    assert.match((await actionMismatchRes2.json()).error, /业务行为不匹配/);

    // 5. Production environment rejects localhost
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ success: true, hostname: "localhost", action: "submit-general" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    const prodLocalhostRes = await submitWorker.fetch(
      createRequest({ title: "笔记", content: "正文内容", type: "notes", turnstileToken: "tok" }),
      createMockEnv({ ENVIRONMENT: "production" })
    );
    assert.equal(prodLocalhostRes.status, 400);
    assert.match((await prodLocalhostRes.json()).error, /主机名无效/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
