import { expect, test } from "@playwright/test";

const basePath = "/Physics-Learning-Wiki/";

test("quiz assets are lazy, quiz sessions survive navigation, and runners resume", async ({ page }) => {
  const quizRequests: string[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (
      url.pathname.endsWith("/features/quiz.js") ||
      url.pathname.endsWith("/css/quiz.css") ||
      url.pathname.endsWith("/manifest.json") ||
      /\/catalog\/(?:sets|questions)\.[^/]+\.json$/.test(url.pathname) ||
      url.pathname.includes("/_generated/question-bank/")
    ) {
      quizRequests.push(url.pathname);
    }
  });

  await page.goto(`${basePath}intro/about/`);
  await expect(page.locator("article.md-content__inner.md-typeset")).toBeVisible();
  expect(quizRequests).toEqual([]);

  await page.locator('nav a[href$="/quiz/"]').first().click();
  await expect(page).toHaveURL(/\/Physics-Learning-Wiki\/quiz\/$/);
  await expect(page.locator(".plw-quiz-home-featured")).toBeVisible();
  await expect(page.locator('head link[data-plw-feature="quiz"]')).toHaveCount(1);
  await expect(page.locator('head link[data-plw-feature="quiz"]')).toHaveAttribute(
    "href",
    expect.stringContaining("quiz.css?v=4")
  );
  expect(quizRequests.filter(path => path.endsWith("/features/quiz.js"))).toHaveLength(1);
  expect(quizRequests.some(path => path.endsWith("/manifest.json"))).toBe(true);
  expect(quizRequests.some(path => /\/catalog\/sets\.[^/]+\.json$/.test(path))).toBe(true);

  await page.getByRole("link", { name: "开始小测" }).first().click();
  await expect(page).toHaveURL(/\/quiz\/play\/\?set=[^&]+&seed=[^&]+/);
  await expect(page.locator(".plw-quiz-question")).toBeVisible();
  const choiceContent = page.locator(".plw-quiz-choice__content").first();
  await expect(choiceContent).toBeVisible();
  expect(await choiceContent.evaluate(el => el.tagName)).toBe("DIV");
  const originalQuestionId = await page.locator(".plw-quiz-question").getAttribute("data-question-id");
  const savedSession = await page.evaluate(() => localStorage.getItem("plw.quiz.v2"));
  expect(savedSession).not.toBeNull();
  expect(Object.values(JSON.parse(savedSession!).activeSessions).flat()).toHaveLength(1);

  await page.goBack();
  await expect(page).toHaveURL(/\/Physics-Learning-Wiki\/quiz\/$/);
  await expect(page.locator(".plw-quiz-home-featured")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/intro\/about\/$/);
  await expect(page.locator("article.md-content__inner.md-typeset")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("plw.quiz.v2"))).toBe(savedSession);
  const questionBankRequestsAtExit = quizRequests.filter(path => path.includes("/_generated/question-bank/")).length;
  await page.waitForTimeout(300);
  expect(quizRequests.filter(path => path.includes("/_generated/question-bank/")).length).toBe(
    questionBankRequestsAtExit
  );

  await page.goForward();
  await expect(page).toHaveURL(/\/Physics-Learning-Wiki\/quiz\/$/);
  await expect(page.locator(".plw-quiz-home-featured")).toHaveCount(1);
  await expect(page.locator('head link[data-plw-feature="quiz"]')).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "继续上次未完成的作答" })).toBeVisible();
  await page.getByRole("link", { name: "继续作答" }).click();
  await expect(page).toHaveURL(/\/quiz\/play\/\?set=[^&]+&seed=[^&]+/);
  await expect(page.locator(".plw-quiz-question")).toBeVisible();
  await expect(page.locator(".plw-quiz-question")).toHaveAttribute("data-question-id", originalQuestionId!);
  expect(await page.evaluate(() => localStorage.getItem("plw.quiz.v2"))).toBe(savedSession);
  expect(quizRequests.filter(path => path.endsWith("/features/quiz.js"))).toHaveLength(1);
});

test("set and question catalogs remain interactive with query navigation", async ({ page }) => {
  await page.goto(`${basePath}quiz/sets/`);
  await expect(page.locator(".plw-quiz-sets")).toBeVisible();
  const setFilter = page.locator(".plw-quiz-search-input");
  await setFilter.fill("no-set-matches-this-query");
  await expect(page.locator(".plw-quiz-empty")).toBeVisible();
  await page.locator("#plw-btn-reset-sets-filters").click();
  await expect(page.locator(".plw-quiz-landing__card").first()).toBeVisible();

  await page.goto(`${basePath}quiz/questions/`);
  await expect(page.locator(".plw-quiz-question-browser")).toBeVisible();
  const questionId = "mech-dyn-newton-0002";
  await page.locator("#plw-filter-keyword").fill(questionId);
  const card = page.locator(`.plw-quiz-question-browser__card[data-question-id="${questionId}"]`);
  await expect(card).toBeVisible();
  await card.locator(".plw-quiz-question-browser__permalink").click();
  await expect(page).toHaveURL(new RegExp(`[?&]q=${questionId}$`));
  await expect(card).toHaveClass(/is-targeted/);

  await page.evaluate(async () => {
    const article = document.querySelector("article.md-content__inner.md-typeset")!;
    const siteBase = JSON.parse(document.querySelector("#__config")!.textContent!).base as string;
    const bundleUrl = new URL("_static/js/features/quiz.js", new URL(siteBase, location.href)).href;
    const feature = (await import(bundleUrl)) as {
      mount(root: ParentNode, context: { signal: AbortSignal }): () => void;
    };
    const root = document.createElement("div");
    root.className = "plw-quiz-inline-root";
    root.dataset.setId = "mechanics.dynamics.newton-laws.quick";
    root.dataset.manifestUrl = "../../_generated/question-bank/manifest.json";
    article.append(root);
    const controller = new AbortController();
    const dispose = feature.mount(root, { signal: controller.signal });
    (window as any).__plwInlineQuizFixture = { root, controller, dispose };
  });
  await expect(page.locator(".plw-quiz-inline")).toBeVisible();
  await expect(page.locator(".plw-quiz-inline__card")).toHaveCount(3);
  const cleared = await page.evaluate(() => {
    const fixture = (window as any).__plwInlineQuizFixture;
    fixture.controller.abort();
    fixture.dispose();
    return fixture.root.innerHTML;
  });
  expect(cleared).toBe("");
});

test("a direct runner honors its seed and shows stale-session recovery", async ({ page }) => {
  const setId = "mechanics.dynamics.newton-laws.quick";
  const seed = "quiz-e2e-stale-seed";
  const runnerUrl = `${basePath}quiz/play/?set=${setId}&seed=${seed}`;
  await page.goto(runnerUrl);
  await expect(page).toHaveURL(new RegExp(`set=${setId}&seed=${seed}$`));
  await expect(page.locator(".plw-quiz-question")).toBeVisible();

  await page.evaluate(
    ({ setId: activeSetId }) => {
      const storage = JSON.parse(localStorage.getItem("plw.quiz.v2")!);
      const activeSession = storage.activeSessions[`set:${activeSetId}`][0];
      activeSession.bankFingerprint = "sha256:stale-fixture";
      localStorage.setItem("plw.quiz.v2", JSON.stringify(storage));
    },
    { setId }
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: "作答进度已失效" })).toBeVisible();
  await expect(page.getByRole("button", { name: "清空旧进度并重新开始" })).toBeVisible();
});
