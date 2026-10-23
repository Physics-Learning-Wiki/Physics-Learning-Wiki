import { expect, test, type Page } from "@playwright/test";
import { mockTurnstile } from "./helpers/turnstile.js";

const base = "/Physics-Learning-Wiki/";
const key = "plw:quiz-set-draft:v1:" + base + ":new";

async function metadata(page: Page) {
  await page.locator("#set-title").fill("牛顿定律训练");
  await page.locator("#set-content").fill("检验对惯性和运动定律的理解．");
  await page.locator("#set-source-kind").selectOption("original");
  await page.locator("#set-source-note").fill("自主编排．");
}

async function newQuestion(page: Page, classified = false) {
  await page.locator('[data-set-step="2"]').click();
  await page.locator("#set-new").click();
  await expect(page.locator("#set-question-editor .CodeMirror")).toHaveCount(2);
  await page.locator("#q-submit-type").selectOption("true_false");
  await page
    .locator(".CodeMirror")
    .nth(0)
    .evaluate((node: any) => node.CodeMirror.setValue("物体不受合外力时速度保持不变．"));
  await page
    .locator(".CodeMirror")
    .nth(1)
    .evaluate((node: any) => node.CodeMirror.setValue("根据牛顿第一定律．"));
  await page.locator("#q-submit-answer").fill("true");
  if (classified) {
    await expect(page.locator("#q-submit-topic-root")).toBeEnabled();
    await page.locator("#q-submit-topic-root").selectOption("mechanics");
    await page.locator("#q-submit-subtopic").selectOption("mechanics.dynamics");
  }
  await page.locator("#submission-source-kind").selectOption("original");
  await page.locator("#submission-source-note").fill("独立原创．");
  await page.getByRole("button", { name: "保存到新题池" }).click();
  await expect(page.locator("#set-new-pool")).toContainText("物体不受合外力");
}

test("mixed set editing, trial isolation and successful submission retain stable item keys", async ({ page }) => {
  await mockTurnstile(page);
  let payload: any;
  await page.route("https://submit.folderrewind.top/**", async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        revision: 1,
        operationState: "completed",
        issueUrl: "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/123"
      })
    });
  });
  await page.goto(base + "quiz/contribute-set/");
  await metadata(page);
  await newQuestion(page, true);
  await page.getByRole("button", { name: "编辑新题", exact: true }).click();
  await expect(page.locator("#q-submit-topic-root")).toHaveValue("mechanics");
  await expect(page.locator("#q-submit-subtopic")).toHaveValue("mechanics.dynamics");
  await page.getByRole("button", { name: "保存到新题池" }).click();
  await expect(page.locator("#set-search-results details").first()).toBeVisible();
  await page.locator("#set-search-results details").first().locator("summary").click();
  await page.locator("#set-search-results details").first().getByRole("button", { name: "加入题集" }).click();
  await expect(page.locator("#set-items li")).toHaveCount(2);
  const before = await page.evaluate(() => localStorage.getItem("plw.quiz.v3"));
  await page.locator('[data-set-step="3"]').click();
  await page.locator("#set-try").click();
  await expect(page.locator("#set-trial")).toContainText("第 1 / 2 题");
  await page.getByRole("button", { name: "返回题集编辑" }).click();
  expect(await page.evaluate(() => localStorage.getItem("plw.quiz.v3"))).toBe(before);
  await page.locator("#set-license").check();
  await page.getByRole("button", { name: "提交题集投稿", exact: true }).click();
  await expect(page.locator("#set-message")).toContainText("已提交");
  expect(payload.type).toBe("quiz-set");
  expect(payload.payload.quizSet.newQuestions).toHaveLength(1);
  expect(payload.payload.quizSet.newQuestions[0].question.topics).toEqual(["mechanics.dynamics"]);
  expect(payload.payload.quizSet.selection.items[0].clientId).toBe(payload.payload.quizSet.newQuestions[0].clientId);
  await page.locator("header a.md-logo").click();
  await expect(page).toHaveURL(url => url.pathname === base);
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBeNull();
});

test("draft recovery retains a single active editor and instant navigation releases it", async ({ page }) => {
  await mockTurnstile(page);
  await page.addInitScript(base => {
    sessionStorage.setItem(
      "plw:pending-submission:v1:" + base + ":plw-question-contribute-form",
      JSON.stringify({
        pending: true,
        snapshot: "{}",
        receipt: {
          schemaVersion: 1,
          submissionId: "11111111-1111-4111-8111-111111111111",
          operationKey: "22222222-2222-4222-8222-222222222222",
          token: "a".repeat(64),
          revision: 0,
          type: "question"
        }
      })
    );
  }, base);
  await page.goto(base + "quiz/contribute-set/");
  await metadata(page);
  await newQuestion(page);
  const saved = await page.evaluate(k => localStorage.getItem(k), key);
  expect(saved).toContain("物体不受合外力");
  await page.reload();
  await page.locator("#set-restore").click();
  await expect(page.locator("#set-title")).toHaveValue("牛顿定律训练");
  await page.locator('[data-set-step="2"]').click();
  await page.getByRole("button", { name: "编辑新题", exact: true }).click();
  await expect(page.locator(".CodeMirror")).toHaveCount(2);
  await expect(page.locator("#set-question-editor .submit-receipt")).toHaveCount(0);
  await expect(page.locator("#q-submit-topic-root")).toBeEnabled();
  await page.locator("#q-submit-topic-root").selectOption("math");
  await expect(page.locator("#q-submit-subtopic")).toHaveValue("");
  await page
    .locator(".CodeMirror")
    .nth(1)
    .evaluate((node: any) => node.CodeMirror.setValue("未保存的改动．"));
  await page.locator("header a.md-logo").click();
  await expect(page).toHaveURL(url => url.pathname === base);
  await expect.poll(() => page.evaluate(k => localStorage.getItem(k), key)).toContain("未保存的改动");
  await page.goto(base + "quiz/contribute-set/");
  await page.locator("#set-restore").click();
  await expect(page.locator("#q-submit-topic-root")).toHaveValue("math");
  await expect(page.locator("#q-submit-subtopic")).toHaveValue("");
  await expect(page.locator("#q-submit-topic")).toHaveValue("");
  await page.locator("#q-submit-subtopic").selectOption("math.linear-algebra");
  await page.getByRole("button", { name: "保存到新题池" }).click();
  await expect.poll(() => page.evaluate(k => localStorage.getItem(k), key)).toContain("math.linear-algebra");
});

test("imported five-type draft runs with shuffled order and immediate feedback", async ({ page }) => {
  await mockTurnstile(page);
  await page.goto(base + "quiz/contribute-set/");
  const variants = [
    {
      type: "single_choice",
      choices: [
        { id: "A", content: "正确" },
        { id: "B", content: "错误" }
      ],
      answer: { choice: "A" }
    },
    {
      type: "multiple_choice",
      choices: [
        { id: "A", content: "正确一" },
        { id: "B", content: "正确二" },
        { id: "C", content: "错误" }
      ],
      answer: { choices: ["A", "B"] }
    },
    { type: "true_false", answer: { value: false } },
    {
      type: "numeric",
      answer: { value: 2, tolerance: { type: "absolute", value: 0.01 }, unit: { required: false, accepted: [] } }
    },
    {
      type: "free_response",
      response: { format: "plain_text", required: true, rows: 3 },
      reference_answer: "参考．",
      grading: {
        mode: "self_assessed",
        rubric: [
          { id: "low", label: "待完善", points: 0 },
          { id: "high", label: "已掌握", points: 1 }
        ]
      }
    }
  ];
  const newQuestions = variants.map((question, index) => ({
    clientId: `0000000${index}-0000-4000-8000-000000000000`,
    question: { ...question, stem: `类型 ${question.type}`, solution: "解析．" },
    sourceDeclaration: { kind: "original", note: "原创．" }
  }));
  const draft = {
    schemaVersion: 1,
    kind: "quiz-set",
    updatedAt: Date.now(),
    title: "五类题型",
    content: "题型试做．",
    attribution: "",
    sourceDeclaration: { kind: "original", note: "编排．" },
    quizSet: {
      tags: [],
      feedbackMode: "immediate",
      selection: {
        type: "fixed",
        order: "shuffle",
        items: newQuestions.map(q => ({ kind: "new", clientId: q.clientId }))
      },
      newQuestions
    }
  };
  await page
    .locator("#set-import")
    .setInputFiles({ name: "draft.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(draft)) });
  await expect(page.locator("#set-title")).toHaveValue("五类题型");
  await page.locator('[data-set-step="3"]').click();
  await page.locator("#set-try").click();
  for (let index = 0; index < variants.length; index++) {
    const trial = page.locator("#set-trial");
    const stem = await trial.locator(".plw-quiz-stem").textContent();
    if (stem?.includes("single_choice")) await trial.locator('label:has(input[value="A"])').click();
    else if (stem?.includes("multiple_choice")) {
      await trial.locator('label:has(input[value="A"])').click();
      await trial.locator('label:has(input[value="B"])').click();
    } else if (stem?.includes("true_false"))
      await trial.locator(".plw-quiz-choice").filter({ hasText: "错误" }).click();
    else if (stem?.includes("numeric")) await trial.locator('input[inputmode="decimal"]').fill("2");
    else {
      await trial.getByRole("textbox", { name: "文字答案" }).fill("作答．");
      await trial.locator('label:has(input[value="high"])').click();
    }
    await trial.getByRole("button", { name: "查看本题反馈" }).click();
    await expect(trial.locator(".plw-quiz-feedback")).toBeVisible();
    if (index < variants.length - 1) await trial.getByRole("button", { name: "下一题", exact: true }).click();
  }
  await page.locator("#set-trial").getByRole("button", { name: "交卷并查看结果" }).click();
  await expect(page.locator("#set-trial")).toContainText("5 / 5");
});

test("collection handoff copies references and preserves the private learning profile", async ({ page }) => {
  await mockTurnstile(page);
  await page.goto(base + "quiz/questions/");
  const card = page.locator(".plw-quiz-question-browser__card").first();
  await expect(card).toBeVisible();
  const questionId = await card.getAttribute("data-question-id");
  await card.getByRole("button", { name: "☆ 收藏", exact: true }).click();
  await page.goto(base + "quiz/library/?view=saved");
  await expect(page.locator(".plw-quiz-library__card")).toBeVisible();
  const before = await page.evaluate(() => localStorage.getItem("plw.quiz.v3"));
  await page.getByRole("button", { name: "从当前收藏夹投稿题集" }).click();
  await expect(page).toHaveURL(/quiz\/contribute-set\//);
  await page.locator("#set-title").fill("公开练习");
  const draft = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key);
  expect(draft.quizSet.selection.items).toEqual([{ kind: "existing", questionId }]);
  expect(JSON.stringify(draft)).not.toMatch(/learning|attempts|savedAt|collectionIds|wrongBook/);
  expect(await page.evaluate(() => localStorage.getItem("plw.quiz.v3"))).toBe(before);
});

test("set receipt revises the latest version and refuses a stale local draft", async ({ page }) => {
  await mockTurnstile(page);
  const id = "33333333-3333-4333-8333-333333333333",
    clientId = "44444444-4444-4444-8444-444444444444";
  const sourceDeclaration = { kind: "original", note: "原创．" };
  const quizSet = {
    tags: [],
    feedbackMode: "deferred",
    selection: { type: "fixed", order: "fixed", items: [{ kind: "new", clientId }] },
    newQuestions: [
      {
        clientId,
        question: { type: "true_false", stem: "修订题．", solution: "解析．", answer: { value: true } },
        sourceDeclaration
      }
    ]
  };
  const record = {
    schemaVersion: 1,
    submissionId: id,
    type: "quiz-set",
    payload: { title: "最新题集", content: "简介．", quizSet },
    licenseConsent: true,
    licenseVersion: "CC-BY-SA-4.0",
    sourceDeclaration
  };
  await page.addInitScript(
    ({ id, record, base }) => {
      sessionStorage.setItem(
        "plw:submission-receipt:v1:" + base + ":" + id,
        JSON.stringify({
          schemaVersion: 1,
          submissionId: id,
          token: "a".repeat(64),
          operationKey: id,
          revision: 1,
          type: "quiz-set"
        })
      );
      localStorage.setItem(
        "plw:quiz-set-draft:v1:" + base + ":" + id,
        JSON.stringify({
          schemaVersion: 1,
          kind: "quiz-set",
          updatedAt: 1,
          submissionId: id,
          baseRevision: 2,
          title: "旧稿",
          content: "旧简介",
          attribution: "",
          sourceDeclaration: record.sourceDeclaration,
          quizSet: record.payload.quizSet
        })
      );
    },
    { id, record, base }
  );
  let posted: any;
  await page.route("https://submit.folderrewind.top/**", async route => {
    if (route.request().method() === "POST") posted = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(
        route.request().method() === "GET" ? { revision: 3, record } : { revision: 4, operationState: "completed" }
      )
    });
  });
  await page.goto(base + "quiz/contribute-set/?submission=" + id);
  await expect(page.locator("#set-title")).toHaveValue("最新题集");
  await page.locator("#set-restore").click();
  await expect(page.locator("#set-message")).toContainText("旧修订");
  await expect(page.locator("#set-title")).toHaveValue("最新题集");
  await page.locator("#set-discard").click();
  await page.locator('[data-set-step="3"]').click();
  await page.locator("#set-license").check();
  await page.getByRole("button", { name: "提交题集投稿", exact: true }).click();
  await expect(page.locator("#set-message")).toContainText("已提交");
  expect(posted.baseRevision).toBe(3);
  expect(posted.payload.quizSet.newQuestions[0].clientId).toBe(clientId);
});
