import { expect, test, type Page } from "@playwright/test";
import { expectAssistiveMathClipped } from "./math-assertions";

const basePath = "/Physics-Learning-Wiki/";

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;
  const browserState = await page
    .evaluate(() => ({
      seed: new URL(location.href).searchParams.get("seed"),
      questionIds: [...document.querySelectorAll("[data-question-id]")].map(el => el.getAttribute("data-question-id")),
      sessions: JSON.parse(localStorage.getItem("plw.quiz.v3") ?? "null")?.activeSessions
    }))
    .catch(error => ({ diagnosticError: String(error) }));
  const diagnostics = { url: page.url(), annotations: testInfo.annotations, ...browserState };
  await testInfo.attach("navigation-diagnostics", {
    body: JSON.stringify(diagnostics, null, 2),
    contentType: "application/json"
  });
});

async function navigateByInstantLink(page: Page, route: string): Promise<void> {
  const target = `${await page.evaluate(() => location.origin)}${basePath}${route}`;
  await page.evaluate(targetUrl => {
    const link = [...document.querySelectorAll<HTMLAnchorElement>("a")].find(anchor => anchor.href === targetUrl);
    if (!link) throw new Error(`No site link points to ${targetUrl}`);
    link.click();
  }, target);
  await expect(page).toHaveURL(new RegExp(`/Physics-Learning-Wiki/${route.replaceAll("/", "\\/")}$`));
  await expect(page.locator("article.md-content__inner.md-typeset")).toBeVisible();
}

async function expectMathPageReady(page: Page): Promise<void> {
  const article = page.locator("article.md-content__inner.md-typeset");
  await expect(article).toHaveAttribute("data-plw-features", /(?:^|\s)math(?:\s|$)/);
  await expect(article.locator("mjx-container:visible").first()).toBeVisible();
  await expectAssistiveMathClipped(article);
  await expect(page.locator(".arithmatex")).toHaveCount(0);
}

async function readMathCssUrls(page: Page): Promise<{ linkUrl: string; featureUrl: string }> {
  await expect(page.locator('link[rel="stylesheet"][href*="mathjax.css"]')).toHaveCount(1);
  await expect
    .poll(() =>
      page.locator('link[rel="stylesheet"][href*="mathjax.css"]').evaluate(el => Boolean((el as HTMLLinkElement).sheet))
    )
    .toBe(true);
  return page.evaluate(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="stylesheet"][href*="mathjax.css"]');
    const article = document.querySelector("article.md-content__inner.md-typeset");
    if (!link || !article) throw new Error("Math CSS link or article root is missing");
    const siteRoot = new URL("/Physics-Learning-Wiki/", location.origin);
    return {
      linkUrl: new URL(link.getAttribute("href") ?? link.href, location.href).href,
      featureUrl: new URL(article.getAttribute("data-plw-math-css") ?? "", siteRoot).href
    };
  });
}

test("instant navigation keeps one ready MathJax stylesheet from an ordinary page", async ({ page }) => {
  await page.goto(`${basePath}intro/about/`);
  await expect(page.locator("article.md-content__inner.md-typeset")).toBeVisible();
  await expect(page.locator('link[href*="mathjax.css"]')).toHaveCount(0);

  await navigateByInstantLink(page, "modern/general-relativity/");
  await expectMathPageReady(page);
  const firstCssUrls = await readMathCssUrls(page);
  expect(firstCssUrls.linkUrl).toBe(firstCssUrls.featureUrl);
  expect(firstCssUrls.linkUrl).toMatch(/[?&]hash=[a-f0-9]{64}$/);

  await navigateByInstantLink(page, "thermodynamics/chapter-1/gas/");
  await expectMathPageReady(page);
  const nextCssUrls = await readMathCssUrls(page);
  expect(nextCssUrls.linkUrl).toBe(firstCssUrls.linkUrl);
  expect(nextCssUrls.featureUrl).toBe(firstCssUrls.featureUrl);
});

test("a direct math entry keeps one versioned MathJax stylesheet across instant navigation", async ({ page }) => {
  await page.goto(`${basePath}modern/general-relativity/`);
  await expectMathPageReady(page);
  const firstCssUrls = await readMathCssUrls(page);
  expect(firstCssUrls.linkUrl).toBe(firstCssUrls.featureUrl);

  await navigateByInstantLink(page, "thermodynamics/chapter-1/gas/");
  await expectMathPageReady(page);
  const nextCssUrls = await readMathCssUrls(page);
  expect(nextCssUrls.linkUrl).toBe(firstCssUrls.linkUrl);
  expect(nextCssUrls.featureUrl).toBe(firstCssUrls.featureUrl);
});

async function expectScreenshotQuestionReady(page: Page): Promise<void> {
  test.info().annotations.push({ type: "question-id", description: "q-000001" });
  await expect(page.locator(".plw-quiz-question-browser")).toBeVisible();
  await page.locator("#plw-filter-keyword").fill("q-000001");
  const card = page.locator('.plw-quiz-question-browser__card[data-question-id="q-000001"]');
  await expect(card).toBeVisible();
  await expectAssistiveMathClipped(card);
  const cssUrls = await readMathCssUrls(page);
  expect(cssUrls.linkUrl).toBe(cssUrls.featureUrl);
}

// Exercise both seed paths and both viewports without repeating the same storage journey four times.
for (const { viewport, seed } of [
  { viewport: { width: 1280, height: 720 }, seed: undefined },
  { viewport: { width: 375, height: 667 }, seed: "instant-navigation-text-2" }
]) {
  test(`${seed ? "text-only" : "random"} quiz navigation preserves answers at ${viewport.width}px`, async ({
    page
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}quiz/`);
    const start = page.getByRole("link", { name: "开始小测", exact: true }).first();
    await expect(start).toBeVisible();
    if (seed) {
      await start.evaluate((anchor, fixedSeed) => {
        const url = new URL((anchor as HTMLAnchorElement).href);
        url.searchParams.set("seed", fixedSeed);
        (anchor as HTMLAnchorElement).href = url.href;
      }, seed);
    }
    await start.click();
    const question = page.locator(".plw-quiz-question");
    await expect(question).toBeVisible();
    const runnerUrl = page.url();
    const actualSeed = new URL(runnerUrl).searchParams.get("seed");
    test.info().annotations.push({ type: "seed", description: actualSeed ?? "missing" });
    expect(actualSeed).toBeTruthy();
    if (seed) expect(actualSeed).toBe(seed);
    const steps = page.locator(".plw-quiz-step-btn");
    await expect(steps).toHaveCount(3);
    const ids: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      await steps.nth(index).click();
      await expect(steps.nth(index)).toHaveClass(/is-current/);
      const id = await question.getAttribute("data-question-id");
      expect(id).toBeTruthy();
      ids.push(id!);
      if (seed) await expect(question.locator("mjx-container, .arithmatex")).toHaveCount(0);
    }
    expect(new Set(ids).size).toBe(3);
    test.info().annotations.push({ type: "question-ids", description: ids.join(", ") });
    await steps.first().click();
    await expect(question).toHaveAttribute("data-question-id", ids[0]);
    const choices = question.locator(".plw-quiz-choice");
    if (await choices.count()) {
      await choices.first().click();
      await expect(choices.first().locator("input")).toBeChecked();
    } else {
      await question.locator(".plw-quiz-numeric-input").fill("1");
      const unit = question.locator(".plw-quiz-numeric-unit");
      if (await unit.locator("option").nth(1).count()) await unit.selectOption({ index: 1 });
    }
    await page.getByRole("button", { name: "检查答案 (Enter)", exact: true }).click();
    await expect(question.locator(".plw-quiz-feedback")).toBeVisible();
    const committed = () =>
      page.evaluate(
        ({ seed: sessionSeed, id }) => {
          const storage = JSON.parse(localStorage.getItem("plw.quiz.v3") ?? "{}");
          const sessions = Object.values(storage.activeSessions ?? {}).flat() as any[];
          return sessions.find(session => session.seed === sessionSeed)?.committedResults[id];
        },
        { seed: actualSeed, id: ids[0] }
      );
    await expect.poll(committed).toBeTruthy();
    const result = await committed();
    await page.goBack();
    await expect(page.locator(".plw-quiz-home-featured")).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(runnerUrl);
    await expect(question).toHaveAttribute("data-question-id", ids[0]);
    await expect(question.locator(".plw-quiz-feedback")).toBeVisible();
    expect(await committed()).toEqual(result);
  });
  test(`quiz math survives head replacement and history at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}quiz/`);
    await expect(page.locator(".plw-quiz-home-featured")).toBeVisible();
    await readMathCssUrls(page);
    // A value on window proves all subsequent transitions stay in this document.
    await page.evaluate(() => {
      (window as any).__plwMathNavigation = true;
    });

    await navigateByInstantLink(page, "quiz/questions/");
    await expectScreenshotQuestionReady(page);
    await page.goBack();
    await expect(page.locator(".plw-quiz-home-featured")).toBeVisible();
    await readMathCssUrls(page);
    await page.goForward();
    await expectScreenshotQuestionReady(page);

    await navigateByInstantLink(page, "modern/general-relativity/");
    await expectMathPageReady(page);
    await navigateByInstantLink(page, "intro/about/");
    await expect(page.locator('link[href*="mathjax.css"]')).toHaveCount(0);
    await navigateByInstantLink(page, "quiz/questions/");
    await expectScreenshotQuestionReady(page);
    expect(await page.evaluate(() => (window as any).__plwMathNavigation)).toBe(true);
  });
}

test("a removed stylesheet is reloaded before quiz content mounts, even on a slow connection", async ({ page }) => {
  await page.goto(`${basePath}quiz/`);
  await expect(page.locator(".plw-quiz-home-featured")).toBeVisible();
  await readMathCssUrls(page);
  let release!: () => void;
  const blocked = new Promise<void>(resolve => {
    release = resolve;
  });
  let requestStarted = false;
  await page.route("**/assets/stylesheets/mathjax.css?*", async route => {
    requestStarted = true;
    await blocked;
    await route.continue();
  });
  try {
    await navigateByInstantLink(page, "quiz/questions/");
    await expect.poll(() => requestStarted).toBe(true);
    await expect(page.locator('link[href*="mathjax.css"]')).toHaveCount(1);
    expect(await page.locator('link[href*="mathjax.css"]').evaluate(el => Boolean((el as HTMLLinkElement).sheet))).toBe(
      false
    );
    await expect(page.locator(".plw-quiz-question-browser")).toHaveCount(0);
    await expect(page.locator("mjx-container")).toHaveCount(0);
  } finally {
    release();
  }
  await expectScreenshotQuestionReady(page);
});
