import { expect, test, type Page } from "@playwright/test";

const basePath = "/Physics-Learning-Wiki/";
const mathJaxUrl = "https://cdn.jsdelivr.net/npm/mathjax@4.0.0/tex-mml-chtml.js";
const turnstileUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

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
          reset() { window.__plwTurnstileCounts.reset += 1; }
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

  await page.locator('nav a[href$="/submit/"]').first().click();
  await expect(page).toHaveURL(/\/submit\/$/);
  await expect(page.locator("#submission-form .CodeMirror")).toHaveCount(1);
  await expect(page.locator("#turnstile-widget .plw-test-turnstile-widget")).toHaveCount(1);
  await expect(page.locator('head link[data-plw-feature="submit"]')).toHaveCount(1);
  expect(requests.filter(url => new URL(url).pathname.endsWith("/features/submit.js"))).toHaveLength(1);
  expect(requests.filter(url => new URL(url).pathname.endsWith("/css/features/submit.css"))).toHaveLength(1);
  expect(requests.some(url => /mathjax/i.test(url))).toBe(false);

  await page.locator('.editor-toolbar button[title="预览"]').click();
  await expect.poll(() => requests.filter(url => url === mathJaxUrl).length).toBe(1);
  await expect(page.locator(".editor-preview-full")).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/intro\/about\/$/);
  await expect(page.locator(".CodeMirror")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__plwTurnstileCounts.remove)).toBe(1);
  await page.goForward();
  await expect(page).toHaveURL(/\/submit\/$/);
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
  await expect(page).toHaveURL(/\/quiz\/$/);
  await page.locator('nav a[href$="/quiz/contribute/"]').first().click();
  await expect(page).toHaveURL(/\/quiz\/contribute\/$/);
  await expect(page.locator("#plw-question-contribute-form .CodeMirror")).toHaveCount(2);
  await expect(page.locator("#turnstile-widget .plw-test-turnstile-widget")).toHaveCount(1);
  await expect(page.locator('head link[data-plw-feature="question-contribute"]')).toHaveCount(1);
  await expect.poll(() => page.locator("#q-submit-topic option").count()).toBeGreaterThan(1);
  expect(requests.some(url => new URL(url).pathname.endsWith("/_generated/question-bank/manifest.json"))).toBe(true);
  expect(requests.filter(url => new URL(url).pathname.endsWith("/features/question-contribute.js"))).toHaveLength(1);
  expect(requests.filter(url => new URL(url).pathname.endsWith("/css/features/question-contribute.css"))).toHaveLength(
    1
  );

  await setEditorText(page, 0, "题干：质量为 $m$ 的小车受到恒力。");
  await page.locator("#q-submit-choices").fill("A|加速度增加");
  await page.locator("#q-submit-answer").fill("A");
  await setEditorText(page, 1, "由牛顿第二定律 $F=ma$，加速度增加。");
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
  await expect(page).toHaveURL(/\/quiz\/$/);
  await expect(page.locator(".CodeMirror")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__plwTurnstileCounts.remove)).toBe(1);
  await page.goBack();
  await expect(page).toHaveURL(/\/intro\/about\/$/);
  await expect(page.locator(".CodeMirror")).toHaveCount(0);
  await page.goForward();
  await expect(page).toHaveURL(/\/quiz\/$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/quiz\/contribute\/$/);
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
