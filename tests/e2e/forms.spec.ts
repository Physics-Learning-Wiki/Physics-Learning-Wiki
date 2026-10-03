import { expect, test, type Page } from "@playwright/test";

const basePath = "/Physics-Learning-Wiki/";
const mathJaxUrl = "https://cdn.jsdelivr.net/npm/mathjax@4.0.0/tex-mml-chtml.js";
const turnstileUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const draftKey = "plw:submission-draft:v1:/Physics-Learning-Wiki/";

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
  await page.locator("#submit-btn").click();
  await expect(page.locator("#submit-status")).toContainText("临时失败");
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), draftKey)).toContain("提交的正文");
  fail = false;
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
  await page.locator("#submit-contact").fill("private-contact");
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
  await expect(page.locator("#submit-contact")).toHaveValue("");
  await expect(page.locator(".CodeMirror")).toContainText("草稿正文");
  await expect(page.locator("#turnstile-widget .plw-test-turnstile-widget")).toBeVisible();
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

async function mockTurnstile(page: Page): Promise<void> {
  await page.route(turnstileUrl, route =>
    route.fulfill({
      contentType: "text/javascript",
      body: `
        window.__plwTurnstileCounts = { render: 0, remove: 0, reset: 0 };
        window.__plwTurnstileWidgets = new Map();
        window.turnstile = {
          render(container, options) {
            const id = String(++window.__plwTurnstileCounts.render);
            const node = document.createElement("div");
            node.className = "plw-test-turnstile-widget";
            node.textContent = "Test verification";
            container.append(node);
            window.__plwTurnstileWidgets.set(id, { container, options });
            setTimeout(() => options.callback("test-turnstile-token"), 0);
            return id;
          },
          remove(id) {
            window.__plwTurnstileCounts.remove += 1;
            window.__plwTurnstileWidgets.get(id)?.container.replaceChildren();
            window.__plwTurnstileWidgets.delete(id);
          },
          reset(id) {
            window.__plwTurnstileCounts.reset += 1;
            const widget=window.__plwTurnstileWidgets.get(id);
            if(widget)setTimeout(()=>widget.options.callback("test-turnstile-token"),0);
          }
        };
      `
    })
  );
}

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
  expect(requests.some(url => /features\/submit\.js|features\/submit\.css|easymde|mathjax|turnstile/i.test(url))).toBe(
    false
  );

  await page.getByRole("button", { name: "参与贡献", exact: true }).click();
  await page.locator('nav a[href$="/submit/"]').first().click();
  await expectPagePath(page, "submit/");
  await expect(page.locator("#submission-form .CodeMirror")).toHaveCount(1);
  await expect(page.locator("#turnstile-widget .plw-test-turnstile-widget")).toHaveCount(1);
  await expect(page.locator('head link[data-plw-feature="submit"]')).toHaveCount(1);
  expect(requests.filter(url => new URL(url).pathname.endsWith("/features/submit.js"))).toHaveLength(1);
  expect(requests.filter(url => new URL(url).pathname.endsWith("/css/features/submit.css"))).toHaveLength(1);
  expect(requests.some(url => /mathjax/i.test(url))).toBe(false);

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
  await page.locator("#submit-btn").click();
  await expect(page.locator("#submit-status")).toContainText("请填写标题、正文和投稿类型");
  await setEditorText(page, 0, "性能投稿正文 $E=mc^2$");
  await page.locator("#submit-btn").click();
  await expect(page.locator("#submit-success")).toBeVisible();
  await expect(page.locator("#submit-issue-link")).toHaveAttribute(
    "href",
    "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/123"
  );
  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toMatchObject({
    title: "性能投稿测试",
    content: "性能投稿正文 $E=mc^2$",
    type: "notes",
    chapter: "经典力学 > 质点动力学",
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
  await page.locator("#q-submit-license").check();
  await page.locator("#q-submit-btn").click();
  await expect(page.locator("#q-submit-status")).toContainText("选择题至少需要提供两个选项");
  await page.locator("#q-submit-choices").fill("A|加速度增加\nB|速度不变");
  await page.locator("#q-submit-topic").selectOption({ index: 1 });
  await page.locator("#q-submit-btn").click();
  await expect(page.locator("#q-submit-success")).toBeVisible();
  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toMatchObject({
    type: "question",
    turnstileToken: "test-turnstile-token",
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

declare global {
  interface Window {
    __plwTurnstileCounts: { render: number; remove: number; reset: number };
  }
}
