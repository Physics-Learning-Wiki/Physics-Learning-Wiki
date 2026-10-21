import { expect, test, type Page } from "@playwright/test";
import { mockTurnstile } from "./helpers/turnstile.js";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const basePath = "/Physics-Learning-Wiki/";
const mathJaxUrl = "https://cdn.jsdelivr.net/npm/mathjax@4.0.0/tex-mml-chtml.js";
const turnstileUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const draftKey = "plw:submission-draft:v1:/Physics-Learning-Wiki/";

async function saveUiEvidence(page: Page, name: string): Promise<void> {
  const directory = resolve("artifacts/ui-audit-2026-10-21/after");
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: resolve(directory, name + ".png"), fullPage: true });
}

test("draft writes flush on instant navigation and storage failures do not disable submission", async ({ page }) => {
  await mockTurnstile(page);
  await page.goto(`${basePath}submit/`);
  await expect(page.locator(".CodeMirror")).toBeVisible();
  await setEditorText(page, 0, "离开前保存");
  await page.locator("header a.md-logo").click();
  await expect(page).toHaveURL(url => url.pathname === basePath);
  expect(await page.evaluate(key => localStorage.getItem(key), draftKey)).toContain("离开前保存");
  await page.evaluate(key => localStorage.removeItem(key), draftKey);
  await page.goto(`${basePath}submit/`);
  await expect(page.locator(".CodeMirror")).toBeVisible();
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("plw:submission-draft:")) throw new DOMException("quota", "QuotaExceededError");
      set.call(this, key, value);
    };
  });
  await setEditorText(page, 0, "无法持久保存也可编辑");
  await expect(page.locator(".submit-draft")).toContainText("无法在此浏览器保存草稿");
  await expect(page.locator("#submit-btn")).toBeEnabled();
});

test("failed submission keeps a draft and successful in-flight edits preserve the newer draft", async ({ page }) => {
  await mockTurnstile(page);
  let fail = true;
  await page.route("https://submit.folderrewind.top/**", async route => {
    if (fail) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ error: "临时失败" })
      });
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 600));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ issueUrl: "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/123" })
    });
  });
  await page.goto(`${basePath}submit/`);
  await page.locator("#submit-type").selectOption("notes");
  await page.locator("#submit-title").fill("发送中的草稿");
  await setEditorText(page, 0, "提交的正文");
  await agreeLicense(page);
  await page.locator("#submit-btn").click();
  await expect(page.locator("#submit-status")).toContainText("临时失败");
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), draftKey)).toContain("提交的正文");
  fail = false;
  await agreeLicense(page);
  await page.locator("#submit-btn").click();
  await expect(page.locator("#submit-btn")).toBeDisabled();
  await setEditorText(page, 0, "发送期间的新正文");
  await expect(page.locator("#submit-success")).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), draftKey)).toContain("发送期间的新正文");
});

test("submission drafts recover explicitly, omit contact data and clear after success", async ({ page }) => {
  await mockTurnstile(page);
  await page.route("https://submit.folderrewind.top/**", route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ issueUrl: "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/123" })
    })
  );
  await page.goto(`${basePath}submit/`);
  await expect(page.getByRole("textbox", { name: "正文 *", exact: true })).toBeAttached();
  await page.locator("#submit-type").selectOption("notes");
  await page.locator("#submit-title").fill("本机草稿");
  await expect(page.locator("#submit-contact")).toHaveCount(0);
  await page.locator("#submit-attribution").fill("private-name");
  await page.locator("#submit-chapter-major").selectOption("经典力学");
  await page.locator("#submit-chapter-minor").selectOption({ label: "质点动力学" });
  await setEditorText(page, 0, "草稿正文 $F=ma$");
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), draftKey)).toContain("草稿正文");
  const stored = await page.evaluate(key => localStorage.getItem(key)!, draftKey);
  expect(stored).not.toMatch(/private-contact|private-name|turnstileToken|attribution|contact/);
  await page.reload();
  await expect(page.getByRole("button", { name: "恢复草稿", exact: true })).toBeVisible();
  await expect(page.locator("#submit-title")).toHaveValue("");
  await page.getByRole("button", { name: "恢复草稿", exact: true }).click();
  await expect(page.locator("#submit-title")).toHaveValue("本机草稿");
  await expect(page.locator("#submit-chapter")).toHaveValue("经典力学 > 质点动力学");
  await expect(page.locator("#submit-contact")).toHaveCount(0);
  await expect(page.locator(".CodeMirror")).toContainText("草稿正文");
  await expect(page.locator("#turnstile-widget .plw-test-turnstile-widget")).toBeVisible();
  await agreeLicense(page);
  await page.locator("#submit-btn").click();
  await expect(page.locator("#submit-success")).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), draftKey)).toBeNull();
});

test("corrupted drafts can be cleared without replacing errata prefill", async ({ page }) => {
  await mockTurnstile(page);
  await page.goto(`${basePath}submit/`);
  await expect(page.locator(".CodeMirror")).toBeVisible();
  await page.evaluate(key => localStorage.setItem(key, "{broken"), draftKey);
  await page.goto(`${basePath}submit/?type=errata&title=预填标题&question_id=example`);
  await expect(page.locator(".submit-draft")).toContainText("草稿损坏");
  await expect(page.locator("#submit-title")).toHaveValue("预填标题");
  await expect(page.locator(".CodeMirror")).toContainText("example");
  await page.getByRole("button", { name: "清除草稿", exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), draftKey)).toBeNull();
  await expect(page.locator("#submit-title")).toHaveValue("预填标题");
});

test("verification resource failure retries without losing the editor or double mounting", async ({ page }) => {
  await page.route(turnstileUrl, route => route.abort());
  await page.goto(`${basePath}submit/`);
  await expect(page.getByRole("button", { name: "重新验证", exact: true })).toBeVisible();
  await page.locator("#submit-title").fill("网络恢复");
  await setEditorText(page, 0, "重试后保留正文");
  await page.unroute(turnstileUrl);
  await mockTurnstile(page);
  await page.getByRole("button", { name: "重新验证", exact: true }).click();
  await expect(page.locator("#turnstile-widget .plw-test-turnstile-widget")).toHaveCount(1);
  await expect(page.locator("#submission-form .CodeMirror")).toHaveCount(1);
  await expect(page.locator("#submit-title")).toHaveValue("网络恢复");
  await expect(page.locator(".CodeMirror")).toContainText("重试后保留正文");
  await expect(page.locator("#submit-status")).toBeEmpty();
});

async function setEditorText(page: Page, index: number, value: string): Promise<void> {
  await page.locator(".CodeMirror").nth(index).click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(value);
}

async function expectPagePath(page: Page, path: string): Promise<void> {
  await expect(page).toHaveURL(url => url.pathname === `${basePath}${path}`);
}

test("submission editor is lazy, previews math on demand, and submits once across instant navigation", async ({
  page
}) => {
  await mockTurnstile(page);
  const requests: string[] = [];
  const submissions: Array<Record<string, unknown>> = [];
  page.on("request", request => requests.push(request.url()));
  await page.route("https://cdn.jsdelivr.net/npm/mathjax@4.0.0/tex-mml-chtml.js", route =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.MathJax = {
        startup: { promise: Promise.resolve() },
        typesetPromise: () => Promise.resolve(),
        typesetClear: () => {}
      };`
    })
  );
  await page.route("https://submit.folderrewind.top/**", async route => {
    submissions.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ issueUrl: "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/123" })
    });
  });

  await page.goto(`${basePath}intro/about/`);
  await expect(page.locator("article.md-content__inner.md-typeset")).toBeVisible();
  expect(
    requests.some(
      url => /features\/submit\.js|features\/submit\.css|easymde|turnstile/i.test(url) || url === mathJaxUrl
    )
  ).toBe(false);

  await page.getByRole("button", { name: "参与贡献", exact: true }).click();
  await page.locator('nav a[href$="/submit/"]').first().click();
  await expectPagePath(page, "submit/");
  await expect(page.locator("#submission-form .CodeMirror")).toHaveCount(1);
  await expect(page.locator("#turnstile-widget .plw-test-turnstile-widget")).toHaveCount(1);
  await expect(page.locator('head link[data-plw-feature="submit"]')).toHaveCount(1);
  expect(requests.filter(url => new URL(url).pathname.endsWith("/features/submit.js"))).toHaveLength(1);
  expect(requests.filter(url => new URL(url).pathname.endsWith("/css/features/submit.css"))).toHaveLength(1);
  expect(requests.some(url => url === mathJaxUrl)).toBe(false);

  const previewButton = page.locator('.editor-toolbar button[title="预览"]');
  await previewButton.click();
  await expect.poll(() => requests.filter(url => url === mathJaxUrl).length).toBe(1);
  await expect(page.locator(".editor-preview-full")).toBeVisible();
  await expect(previewButton).toBeEnabled();

  // Exit preview by clicking the still-enabled preview button
  await previewButton.click();
  await expect(page.locator(".editor-preview-active")).toHaveCount(0);
  await expect(page.locator("#submission-form .CodeMirror")).toBeVisible();

  // Edit content, then enter preview again
  await setEditorText(page, 0, "再次编辑正文 $E=mc^2$");
  await previewButton.click();
  await expect(page.locator(".editor-preview-full")).toBeVisible();
  await expect(previewButton).toBeEnabled();

  // MathJax script requested only once and head tag is unique
  expect(requests.filter(url => url === mathJaxUrl).length).toBe(1);
  expect(await page.locator('head script[data-plw-preview-mathjax="true"]').count()).toBe(1);

  // Return to editing mode
  await previewButton.click();
  await expect(page.locator(".editor-preview-active")).toHaveCount(0);

  await page.goBack();
  await expectPagePath(page, "intro/about/");
  await expect(page.locator(".CodeMirror")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__plwTurnstileCounts.remove)).toBe(1);
  await page.goForward();
  await expectPagePath(page, "submit/");
  await expect(page.locator("#submission-form .CodeMirror")).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.__plwTurnstileCounts.render)).toBe(2);
  expect(requests.filter(url => new URL(url).pathname.endsWith("/features/submit.js"))).toHaveLength(1);
  expect(requests.filter(url => url === turnstileUrl)).toHaveLength(1);

  await page.locator("#submit-type").selectOption("notes");
  await page.locator("#submit-title").fill("性能投稿测试");
  await page.locator("#submit-chapter-major").selectOption("经典力学");
  await page.locator("#submit-chapter-minor").selectOption({ label: "质点动力学" });
  await agreeLicense(page);
  await page.locator("#submit-btn").click();
  await expect(page.locator("#submit-status")).toContainText("请填写标题、正文和投稿类型");
  await setEditorText(page, 0, "性能投稿正文 $E=mc^2$");
  await agreeLicense(page);
  await page.locator("#submit-btn").click();
  await expect(page.locator("#submit-success")).toBeVisible();
  await expect(page.locator("#submit-issue-link")).toHaveAttribute(
    "href",
    "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/123"
  );
  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toMatchObject({
    payload: { title: "性能投稿测试", content: "性能投稿正文 $E=mc^2$", chapter: "经典力学 > 质点动力学" },
    type: "notes",
    turnstileToken: "test-turnstile-token"
  });
});

test("question contribution loads taxonomy and disposes both editors and its Turnstile widget", async ({ page }) => {
  await mockTurnstile(page);
  const requests: string[] = [];
  const submissions: Array<Record<string, unknown>> = [];
  page.on("request", request => requests.push(request.url()));
  await page.route("https://submit.folderrewind.top/**", async route => {
    submissions.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ issueUrl: "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/456" })
    });
  });

  await page.goto(`${basePath}intro/about/`);
  expect(
    requests.some(url => /features\/question-contribute\.js|features\/question-contribute\.css|turnstile/i.test(url))
  ).toBe(false);
  await page.locator('nav a[href$="/quiz/"]').first().click();
  await expectPagePath(page, "quiz/");
  await page.locator('nav a[href$="/quiz/contribute/"]').first().click();
  await expectPagePath(page, "quiz/contribute/");
  await expect(page.locator("#plw-question-contribute-form .CodeMirror")).toHaveCount(2);
  await expect(page.locator("#turnstile-widget .plw-test-turnstile-widget")).toHaveCount(1);
  await expect(page.locator('head link[data-plw-feature="question-contribute"]')).toHaveCount(1);
  await expect.poll(() => page.locator("#q-submit-topic option").count()).toBeGreaterThan(1);
  expect(requests.some(url => new URL(url).pathname.endsWith("/_generated/question-bank/manifest.json"))).toBe(true);
  expect(requests.filter(url => new URL(url).pathname.endsWith("/features/question-contribute.js"))).toHaveLength(1);
  expect(requests.filter(url => new URL(url).pathname.endsWith("/css/features/question-contribute.css"))).toHaveLength(
    1
  );

  await page.route("https://cdn.jsdelivr.net/npm/mathjax@4.0.0/tex-mml-chtml.js", route =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.MathJax = {
        startup: { promise: Promise.resolve() },
        typesetPromise: () => Promise.resolve(),
        typesetClear: () => {}
      };`
    })
  );

  await setEditorText(page, 0, "题干：质量为 $m$ 的小车受到恒力。");
  await page.locator("#q-submit-choices").fill("A|加速度增加");
  await page.locator("#q-submit-answer").fill("A");
  await setEditorText(page, 1, "由牛顿第二定律 $F=ma$，加速度增加。");

  // Verify preview toggle and independence for editor 0 (stem) and editor 1 (solution)
  const stemPreviewBtn = page.locator('.editor-toolbar button[title="预览"]').nth(0);
  const solutionPreviewBtn = page.locator('.editor-toolbar button[title="预览"]').nth(1);

  await stemPreviewBtn.click();
  await expect(page.locator(".editor-preview-active")).toHaveCount(1);
  // Editor 1 should NOT be in preview mode
  await expect(page.locator(".CodeMirror").nth(1)).toBeVisible();
  await expect(stemPreviewBtn).toBeEnabled();

  // Exit preview on stem
  await stemPreviewBtn.click();
  await expect(page.locator(".editor-preview-active")).toHaveCount(0);
  await expect(page.locator(".CodeMirror").nth(0)).toBeVisible();

  // Verify preview toggle on editor 1 (solution)
  await solutionPreviewBtn.click();
  await expect(page.locator(".editor-preview-active")).toHaveCount(1);
  // Editor 0 should NOT be in preview mode
  await expect(page.locator(".CodeMirror").nth(0)).toBeVisible();
  await expect(solutionPreviewBtn).toBeEnabled();

  // Exit preview on solution
  await solutionPreviewBtn.click();
  await expect(page.locator(".editor-preview-active")).toHaveCount(0);
  await expect(page.locator(".CodeMirror").nth(1)).toBeVisible();
  expect(
    await page.locator("#plw-question-contribute-form").evaluate(form => (form as HTMLFormElement).checkValidity())
  ).toBe(false);
  await agreeLicense(page);
  await page.locator("#q-submit-btn").click();
  await expect(page.locator("#q-submit-status")).toContainText("单选题需要 2 到 6 个选项");
  await expect(page.locator("#q-submit-status")).toHaveCSS("border-top-style", "solid");
  await saveUiEvidence(page, "question-validation-error");
  await page.locator("#q-submit-choices").fill("A|加速度增加\nB|速度不变");
  await page.locator("#q-submit-topic").selectOption({ index: 1 });
  await page.locator("#q-submit-btn").click();
  await expect(page.locator("#q-submit-success")).toBeVisible();
  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toMatchObject({
    type: "question",
    turnstileToken: "test-turnstile-token",
    payload: {
      question: {
        type: "single_choice",
        stem: "题干：质量为 $m$ 的小车受到恒力。",
        choices: [
          { id: "A", content: "加速度增加" },
          { id: "B", content: "速度不变" }
        ],
        answer: { choice: "A" },
        solution: "由牛顿第二定律 $F=ma$，加速度增加。",
        topics: [expect.any(String)]
      }
    }
  });
  await expect(page.locator("#q-submit-issue-link")).toHaveAttribute(
    "href",
    "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/456"
  );

  await page.goBack();
  await expectPagePath(page, "quiz/");
  await expect(page.locator(".CodeMirror")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__plwTurnstileCounts.remove)).toBe(1);
  await page.goBack();
  await expectPagePath(page, "intro/about/");
  await expect(page.locator(".CodeMirror")).toHaveCount(0);
  await page.goForward();
  await expectPagePath(page, "quiz/");
  await page.goForward();
  await expectPagePath(page, "quiz/contribute/");
  await expect(page.locator("#plw-question-contribute-form .CodeMirror")).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => window.__plwTurnstileCounts.render)).toBe(2);
  expect(requests.filter(url => new URL(url).pathname.endsWith("/features/question-contribute.js"))).toHaveLength(1);
  expect(requests.filter(url => url === turnstileUrl)).toHaveLength(1);
});

test("DOMPurify live preview sanitizes XSS while preserving markdown, LaTeX, and safe links", async ({ page }) => {
  await mockTurnstile(page);
  await page.route("https://cdn.jsdelivr.net/npm/mathjax@4.0.0/tex-mml-chtml.js", route =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.MathJax = {
        startup: { promise: Promise.resolve() },
        typesetPromise: () => Promise.resolve(),
        typesetClear: () => {}
      };`
    })
  );

  await page.goto(`${basePath}submit/`);
  await expect(page.locator("#submission-form .CodeMirror")).toHaveCount(1);

  // Set attack payloads alongside valid Markdown, LaTeX and link
  const maliciousMarkdown = [
    "这是 **粗体内容** 和 [正常安全链接](https://physics.example.com)．",
    "",
    "数学公式：$E = mc^2$",
    "",
    '<img src="x" onerror="window.__xss_flag = true">',
    "<script>window.__xss_flag = true;</script>",
    '<iframe src="https://evil.com"></iframe>',
    '<a href="javascript:window.__xss_flag = true">点击触发XSS</a>',
    '<div onclick="window.__xss_flag = true">点击执行</div>'
  ].join("\n");

  await setEditorText(page, 0, maliciousMarkdown);

  const previewButton = page.locator('.editor-toolbar button[title="预览"]');
  await previewButton.click();
  await expect(page.locator(".editor-preview-full")).toBeVisible();

  // 1. Assert XSS payloads were sanitized and never executed in browser window
  const executed = await page.evaluate(() => (window as unknown as { __xss_flag?: boolean }).__xss_flag);
  expect(executed).toBeUndefined();

  // 2. Dangerous tags stripped by DOMPurify
  await expect(page.locator(".editor-preview-full script")).toHaveCount(0);
  await expect(page.locator(".editor-preview-full iframe")).toHaveCount(0);

  // 3. Event handlers and javascript: schemes stripped
  const previewHtml = await page.locator(".editor-preview-full").innerHTML();
  expect(previewHtml).not.toMatch(/onerror/i);
  expect(previewHtml).not.toMatch(/onclick/i);
  expect(previewHtml).not.toMatch(/javascript:/i);

  // 4. Safe Markdown elements, safe links, and LaTeX are preserved
  await expect(page.locator(".editor-preview-full strong")).toHaveText("粗体内容");
  await expect(page.locator('.editor-preview-full a[href="https://physics.example.com"]')).toBeVisible();
  expect(previewHtml).toContain("E = mc^2");

  // 5. Exit preview and ensure editing remains functional
  await previewButton.click();
  await expect(page.locator(".editor-preview-active")).toHaveCount(0);
  await expect(page.locator("#submission-form .CodeMirror")).toBeVisible();
});

declare global {
  interface Window {
    __plwTurnstileCounts: { render: number; remove: number; reset: number };
  }
}

async function agreeLicense(page: Page): Promise<void> {
  await page.locator("#submission-source-kind").selectOption("original");
  await page.locator("#submission-source-note").fill("由本人整理撰写的测试稿件");
  await page.locator("#submit-license, #q-submit-license").check();
}

test("question numeric drafts restore explicitly and never restore identity, consent or credentials", async ({
  page
}) => {
  await mockTurnstile(page);
  await page.goto(`${basePath}quiz/contribute/`);
  await page.locator("#q-submit-type").selectOption("numeric");
  await expect(page.locator("#q-submit-tolerance-hint")).toContainText("绝对容差与答案同单位");
  await expect(page.getByLabel("试算答案单位", { exact: true })).toBeVisible();
  await setEditorText(page, 0, "测量一个极小物理量的数值．");
  await setEditorText(page, 1, "根据给定条件计算．");
  await page.locator("#q-submit-answer").fill("1e-30");
  await page.locator("#q-submit-tolerance-type").selectOption("relative");
  await expect(page.locator("#q-submit-tolerance-hint")).toContainText("输入 1 表示");
  await page.locator("#q-submit-tolerance").fill("1");
  await page.locator("#q-submit-unit-required").check();
  await page.locator("#q-submit-unit-canonical").fill("m");
  await page.locator("#q-submit-unit-accepted").fill("m, metre");
  await page.locator("#q-submit-attribution").fill("private-author");
  await agreeLicense(page);
  await page.locator("#q-submit-numeric-example").fill("1e-20");
  await page.locator("#q-submit-numeric-example-unit").fill("m");
  await expect(page.locator("#q-submit-numeric-result")).toContainText("判为错误");
  const key = "plw:question-draft:v1:/Physics-Learning-Wiki/";
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), key)).toContain("1e-30");
  expect(await page.evaluate(key => localStorage.getItem(key), key)).not.toMatch(
    /private-author|licenseConsent|turnstileToken|Bearer/
  );
  await page.reload();
  await page.getByRole("button", { name: "恢复题目草稿", exact: true }).click();
  await expect(page.locator("#q-submit-type")).toHaveValue("numeric");
  await expect(page.locator("#q-submit-answer")).toHaveValue("1e-30");
  await expect(page.locator("#q-submit-tolerance")).toHaveValue("1");
  await expect(page.locator("#q-submit-tolerance-hint")).toContainText("输入 1 表示");
  await page.locator("#q-submit-tolerance-type").selectOption("absolute");
  await expect(page.locator("#q-submit-tolerance-hint")).toContainText("绝对容差与答案同单位");
  await expect(page.locator("#q-submit-tolerance")).toHaveValue("1");
  await expect(page.locator("#q-submit-attribution")).toHaveValue("");
  await expect(page.locator("#q-submit-license")).not.toBeChecked();
  const exported = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出题目草稿", exact: true }).click();
  expect((await exported).suggestedFilename()).toBe("plw-question-draft.json");
});

test("receipt management authenticates through headers and withdrawal remains pending", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockTurnstile(page);
  const id = "123e4567-e89b-42d3-a456-426614174000",
    token = "a".repeat(64);
  const receipt = {
    schemaVersion: 1,
    submissionId: id,
    token,
    operationKey: "123e4567-e89b-42d3-a456-426614174001",
    revision: 1,
    type: "notes"
  };
  const requests: Array<{ method: string; authorization?: string; url: string }> = [];
  let withdrawalRequested = false;
  await page.route("https://submit.folderrewind.top/**", async route => {
    const request = route.request();
    requests.push({ method: request.method(), authorization: request.headers().authorization, url: request.url() });
    if (request.method() === "POST") withdrawalRequested = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        submissionId: id,
        type: "notes",
        revision: 2,
        stage: "received",
        operationState: "completed",
        withdrawalRequested,
        published: { revision: 1, url: "https://physics-learning-wiki.github.io/Physics-Learning-Wiki/community/123/" }
      })
    });
  });
  await page.goto(`${basePath}submission/status/?id=${id}`);
  await expect(page.locator("#submission-query-message")).toContainText("已收到");
  await expect(page.locator("#submission-author-actions")).toBeHidden();
  await page.locator("#submission-receipt-file").setInputFiles({
    name: "receipt.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(receipt))
  });
  await expect(page.locator("#submission-author-actions")).toBeVisible();
  await expect(page.getByRole("link", { name: "访问当前线上版本（第 1 版）" })).toBeVisible();
  await expect(page.locator("#submission-edit-link")).toHaveAttribute("href", new RegExp("submission=" + id));
  await saveUiEvidence(page, "receipt-management-mobile");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载管理回执", exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe("plw-receipt-" + id + ".json");
  const stream = await download.createReadStream();
  let rawReceipt = "";
  for await (const chunk of stream!) rawReceipt += chunk.toString("utf8");
  expect(JSON.parse(rawReceipt)).toMatchObject({ submissionId: id, token, revision: 2 });
  await page.getByRole("button", { name: "查询进度", exact: true }).click();
  await expect(page.locator("#submission-query-message")).toContainText("已收到");
  await expect(page.locator("#plw-submission-status .submit-verification-actions")).toHaveCount(1);
  await page.locator("#submission-withdraw-reason").fill("需要修正后重新整理．");
  await expect(page.locator("#turnstile-widget .plw-test-turnstile-widget")).toBeVisible();
  await page.getByRole("button", { name: "提交撤稿申请", exact: true }).click();
  await expect(page.locator("#submission-query-message")).toContainText("撤稿申请已收到");
  expect(requests.find(r => r.method === "POST")?.authorization).toBe("Bearer " + token);
  expect(requests.every(r => !r.url.includes(token))).toBe(true);
  await expect(page.getByRole("button", { name: "提交撤稿申请", exact: true })).toBeDisabled();
  await saveUiEvidence(page, "withdrawal-received-mobile");
});

test("author revision retains structured question metadata and requires renewed consent", async ({ page }) => {
  await mockTurnstile(page);
  const id = "123e4567-e89b-42d3-a456-426614174000",
    token = "a".repeat(64);
  await page.addInitScript(
    ({ id, token }) =>
      sessionStorage.setItem(
        "plw:submission-receipt:v1:/Physics-Learning-Wiki/:" + id,
        JSON.stringify({
          schemaVersion: 1,
          submissionId: id,
          token,
          operationKey: "123e4567-e89b-42d3-a456-426614174001",
          revision: 1,
          type: "question"
        })
      ),
    { id, token }
  );
  let submitted: Record<string, unknown> | undefined;
  const question = {
    type: "true_false",
    stem: "原稿判断题题干．",
    solution: "原稿解析．",
    answer: { value: true },
    hints: ["保留的提示"],
    external_media: [
      { url: "https://example.com/a.png", alt: "图一", rights_note: "作者授权" },
      { url: "https://example.com/b.png", alt: "图二", rights_note: "作者授权" }
    ]
  };
  await page.route("https://submit.folderrewind.top/**", async route => {
    if (route.request().method() === "POST") submitted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(
        submitted
          ? { revision: 3, issueUrl: "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/123" }
          : {
              revision: 2,
              record: {
                schemaVersion: 1,
                submissionId: id,
                type: "question",
                payload: { title: "判断题", content: question.stem, question, attribution: "作者" },
                sourceDeclaration: { kind: "original", note: "本人整理" }
              }
            }
      )
    });
  });
  await page.goto(`${basePath}quiz/contribute/?submission=${id}`);
  await expect(page.locator("#q-submit-status")).toContainText("正在修订第 2 版");
  await expect(page.locator("#q-submit-license")).not.toBeChecked();
  await expect(page.locator("#q-submit-attribution")).toHaveValue("作者");
  await setEditorText(page, 1, "作者修订后的解析．");
  await agreeLicense(page);
  await page.locator("#q-submit-btn").click();
  await expect(page.locator("#q-submit-success")).toBeVisible();
  expect(submitted).toMatchObject({
    submissionId: id,
    baseRevision: 2,
    payload: {
      question: { hints: ["保留的提示"], external_media: question.external_media, solution: "作者修订后的解析．" }
    }
  });
});

test("lookup rejects invalid IDs and receipts, reports pending and recovers after a server failure", async ({
  page
}) => {
  const id = "123e4567-e89b-42d3-a456-426614174000";
  let release: (() => void) | undefined;
  let fail = true;
  let requests = 0;
  await page.route("https://submit.folderrewind.top/**", async route => {
    requests++;
    if (fail)
      await new Promise<void>(resolve => {
        release = resolve;
      });
    await route.fulfill({
      status: fail ? 503 : 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(
        fail
          ? { message: "暂时不可用，请重试．" }
          : {
              submissionId: id,
              type: "notes",
              revision: 1,
              stage: "received"
            }
      )
    });
  });
  await page.goto(`${basePath}submission/status/`);
  const message = page.locator("#submission-query-message");
  await page.getByLabel("投稿编号", { exact: true }).fill("invalid");
  await page.getByRole("button", { name: "查询进度", exact: true }).click();
  await expect(message).toContainText("有效投稿编号");
  await expect(message).toHaveClass(/error/);
  expect(requests).toBe(0);
  await page.locator("#submission-receipt-file").setInputFiles({
    name: "bad-receipt.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}")
  });
  await expect(message).toContainText("回执格式无效");
  await page.getByLabel("投稿编号", { exact: true }).fill(id);
  await page.getByRole("button", { name: "查询进度", exact: true }).click();
  await expect(message).toHaveClass(/pending/);
  await expect(page.getByRole("button", { name: "正在查询…", exact: true })).toBeDisabled();
  await expect.poll(() => Boolean(release)).toBe(true);
  release!();
  await expect(message).toContainText("暂时不可用");
  await expect(message).toHaveClass(/error/);
  fail = false;
  await page.getByRole("button", { name: "查询进度", exact: true }).click();
  await expect(message).toContainText("已收到");
  await expect(message).toHaveClass(/success/);
  await expect(page.locator("#submission-author-actions")).toBeHidden();
});

test("withdrawal failure and accepted-pending responses preserve the receipt and retry feedback", async ({ page }) => {
  await mockTurnstile(page);
  const receipt = {
    schemaVersion: 1,
    submissionId: "123e4567-e89b-42d3-a456-426614174000",
    token: "b".repeat(64),
    operationKey: "123e4567-e89b-42d3-a456-426614174001",
    revision: 1,
    type: "notes"
  };
  let fail = true;
  const keys: string[] = [];
  await page.route("https://submit.folderrewind.top/**", async route => {
    const post = route.request().method() === "POST";
    if (post) keys.push(route.request().headers()["idempotency-key"]);
    await route.fulfill({
      status: post ? (fail ? 503 : 202) : 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(
        post
          ? { message: "暂时无法提交撤稿申请．" }
          : {
              submissionId: receipt.submissionId,
              type: "notes",
              stage: "received",
              revision: 1
            }
      )
    });
  });
  await page.goto(`${basePath}submission/status/`);
  await page.locator("#submission-receipt-file").setInputFiles({
    name: "receipt.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(receipt))
  });
  await page.getByLabel("撤稿申请说明", { exact: true }).fill("修订后重新整理．");
  await expect(page.locator("#turnstile-widget .plw-test-turnstile-widget")).toBeVisible();
  const submit = page.getByRole("button", { name: "提交撤稿申请", exact: true });
  await submit.click();
  await expect(page.locator("#submission-query-message")).toHaveClass(/error/);
  await expect(submit).toBeEnabled();
  await expect(page.getByRole("button", { name: "下载管理回执", exact: true })).toBeVisible();
  fail = false;
  await submit.click();
  await expect(page.locator("#submission-query-message")).toContainText("正在确认撤稿申请");
  await expect(page.locator("#submission-query-message")).toHaveClass(/pending/);
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
});

test("question submission server errors keep the editor and render the shared error panel", async ({ page }) => {
  await mockTurnstile(page);
  await page.route("https://submit.folderrewind.top/**", route =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ message: "题目服务暂时不可用，请保留草稿．" })
    })
  );
  await page.goto(`${basePath}quiz/contribute/`);
  await expect(page.locator(".CodeMirror")).toHaveCount(2);
  await page.locator("#q-submit-type").selectOption("true_false");
  await setEditorText(page, 0, "质量是惯性大小的量度．");
  await setEditorText(page, 1, "根据惯性的定义判断．");
  await page.locator("#q-submit-answer").fill("true");
  await agreeLicense(page);
  await page.getByRole("button", { name: "提交题目投稿", exact: true }).click();
  await expect(page.locator("#q-submit-status")).toContainText("题目服务暂时不可用");
  await expect(page.locator("#q-submit-status")).toHaveCSS("border-top-style", "solid");
  await expect(page.locator(".CodeMirror").first()).toContainText("质量是惯性大小的量度");
  await expect(page.locator("#q-submit-success")).toBeHidden();
  await saveUiEvidence(page, "question-server-error");
});
