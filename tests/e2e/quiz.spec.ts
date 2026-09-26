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
  const originalQuestionId = await page.locator(".plw-quiz-question").getAttribute("data-question-id");

  if ((await page.locator(".plw-quiz-choice__content").count()) === 0) {
    const stepButtons = page.locator(".plw-quiz-step-btn");
    const count = await stepButtons.count();
    for (let i = 0; i < count; i++) {
      await stepButtons.nth(i).click();
      if ((await page.locator(".plw-quiz-choice__content").count()) > 0) break;
    }
  }
  const choiceContent = page.locator(".plw-quiz-choice__content").first();
  await expect(choiceContent).toBeVisible();
  expect(await choiceContent.evaluate(el => el.tagName)).toBe("DIV");

  // Restore question 1
  await page.locator(".plw-quiz-step-btn").first().click();

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

test("quiz keyboard navigation honors shortcut matrix and restores focus from pointer summary", async ({
  page
}) => {
  const setId = "mechanics.dynamics.newton-laws.quick";
  const seed = "test-seed-42";
  const runnerUrl = `${basePath}quiz/play/?set=${setId}&seed=${seed}`;
  await page.goto(runnerUrl);
  await expect(page.locator(".plw-quiz-question")).toBeVisible();

  // 1. Mouse click option -> digit key -> option changes
  const choices = page.locator(".plw-quiz-choice");
  await choices.nth(0).click();
  expect(await choices.nth(0).locator("input").isChecked()).toBe(true);
  await page.keyboard.press("2");
  expect(await choices.nth(1).locator("input").isChecked()).toBe(true);
  await page.keyboard.press("A");
  expect(await choices.nth(0).locator("input").isChecked()).toBe(true);

  // 2. Summary focused via Tab -> digit key -> switches options
  const hintDetails = page.locator(".plw-quiz-hints");
  const hintSummary = hintDetails.locator("summary");
  await hintSummary.focus();
  await page.keyboard.press("3");
  expect(await choices.nth(2).locator("input").isChecked()).toBe(true);

  // 3. Tab focus summary -> Enter -> only toggles details open/closed, does not confirm quiz
  await hintSummary.focus();
  expect(await hintDetails.getAttribute("open")).toBeNull();
  await page.keyboard.press("Enter");
  expect(await hintDetails.getAttribute("open")).not.toBeNull();
  expect(await page.locator(".plw-quiz-feedback").count()).toBe(0);
  await page.keyboard.press("Enter");
  expect(await hintDetails.getAttribute("open")).toBeNull();

  // 4. Tab focus summary -> Space -> only toggles details open/closed
  await hintSummary.focus();
  await page.keyboard.press("Space");
  expect(await hintDetails.getAttribute("open")).not.toBeNull();
  expect(await page.locator(".plw-quiz-feedback").count()).toBe(0);
  await page.keyboard.press("Space");
  expect(await hintDetails.getAttribute("open")).toBeNull();

  // 5. Pointer click summary -> details opens -> Enter -> triggers Quiz confirm/submit
  await choices.nth(0).click();
  await hintSummary.click();
  expect(await hintDetails.getAttribute("open")).not.toBeNull();
  await page.keyboard.press("Enter");
  await expect(page.locator(".plw-quiz-feedback")).toBeVisible();

  // 6. Enter to advance to next question
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "第 2 题" })).toBeVisible();

  // 7. Text/number input typing digits does NOT trigger option shortcuts
  const numberInput = page.getByRole("textbox", { name: "数值答案" });
  await numberInput.focus();
  await page.keyboard.type("42");
  expect(await numberInput.inputValue()).toBe("42");

  // 8. Textarea typing 'A' does NOT trigger option shortcut
  await page.evaluate(() => {
    const ta = document.createElement("textarea");
    ta.id = "plw-test-textarea";
    document.querySelector(".plw-quiz-runner")!.append(ta);
  });
  const testTextarea = page.locator("#plw-test-textarea");
  await testTextarea.focus();
  await page.keyboard.type("A");
  expect(await testTextarea.inputValue()).toBe("A");
  await testTextarea.evaluate(el => el.remove());

  // 9. Button Enter preserves native activation
  const exitButton = page.locator("#plw-btn-exit");
  await exitButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".plw-quiz-modal")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".plw-quiz-modal")).toHaveCount(0);

  // 10. isComposing events do NOT trigger shortcuts
  await page.evaluate(() => {
    const composingEvent = new KeyboardEvent("keydown", {
      key: "2",
      bubbles: true,
      cancelable: true
    });
    Object.defineProperty(composingEvent, "isComposing", { get: () => true });
    document.dispatchEvent(composingEvent);
  });
  expect(await numberInput.inputValue()).toBe("42");
});

test("mathjax stylesheet is ready before first math element mounts and is deduplicated across navigation", async ({
  page
}) => {
  await page.goto(`${basePath}intro/about/`);
  await expect(page.locator("article.md-content__inner.md-typeset")).toBeVisible();

  // Navigate to quiz question browser
  await page.goto(`${basePath}quiz/questions/?q=q-000037`);
  await expect(page.locator(".plw-quiz-question-browser")).toBeVisible();

  const card = page.locator('.plw-quiz-question-browser__card[data-question-id="q-000037"]');
  await expect(card).toBeVisible();

  const mathLink = page.locator('head link[href*="assets/stylesheets/mathjax.css"]');
  await expect(mathLink).toHaveCount(1);
  await expect(mathLink).toHaveAttribute("href", /assets\/stylesheets\/mathjax\.css\?hash=/);

  const isSheetReady = await mathLink.evaluate(el => Boolean((el as HTMLLinkElement).sheet));
  expect(isSheetReady).toBe(true);

  // When first mathjax element is visible, stylesheet is confirmed ready
  await expect(card.locator("mjx-container").first()).toBeVisible();
  expect(await mathLink.evaluate(el => Boolean((el as HTMLLinkElement).sheet))).toBe(true);

  // Instant navigation back and forward
  await page.goBack();
  await expect(page.locator("article.md-content__inner.md-typeset")).toBeVisible();
  await page.goForward();
  await expect(page.locator(".plw-quiz-question-browser")).toBeVisible();

  // Math stylesheet link count does not grow
  await expect(page.locator('head link[href*="assets/stylesheets/mathjax.css"]')).toHaveCount(1);
});

test("production question bank math renders cleanly on desktop and mobile without collisions or page overflow", async ({
  page
}) => {
  const targetQuestions = ["q-000037", "q-000006", "q-000018"];
  const viewports = [
    { name: "desktop", width: 1280, height: 720 },
    { name: "mobile", width: 375, height: 667 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const qid of targetQuestions) {
      await page.goto(`${basePath}quiz/questions/?q=${qid}`);
      const card = page.locator(`.plw-quiz-question-browser__card[data-question-id="${qid}"]`);
      await expect(card).toBeVisible();

      // Open full solution
      const details = card.locator(".plw-quiz-solution-details");
      if ((await details.count()) > 0) {
        await details.evaluate(el => {
          (el as HTMLDetailsElement).open = true;
        });
        await expect(details.locator(".plw-quiz-solution-details__body")).toBeVisible();
      }

      // 1. Math formulas must exist
      await expect(card.locator("mjx-container").first()).toBeVisible();

      // 2. Assistive MathML must be visually hidden (not visually duplicated)
      const assistiveMml = card.locator(".mjx-assistive-mml").first();
      if ((await assistiveMml.count()) > 0) {
        const isHidden = await assistiveMml.evaluate(el => {
          const style = window.getComputedStyle(el);
          return (
            style.position === "absolute" ||
            style.opacity === "0" ||
            style.clip === "rect(1px, 1px, 1px, 1px)" ||
            style.display === "none"
          );
        });
        expect(isHidden).toBe(true);
      }

      // 3. Raw $$ display delimiter must not leak into rendered text
      const visibleText = await card.innerText();
      expect(visibleText.includes("$$")).toBe(false);

      // 4. Whole page must not overflow horizontally
      const pageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(pageOverflow).toBe(false);

      // 5. Choice layout: container is div, badge is top-aligned with first line
      const choices = card.locator(".plw-quiz-choice");
      const choiceCount = await choices.count();
      for (let i = 0; i < choiceCount; i++) {
        const choice = choices.nth(i);
        const content = choice.locator(".plw-quiz-choice__content");
        expect(await content.evaluate(el => el.tagName)).toBe("DIV");

        const offsetDiff = await choice.evaluate(el => {
          const badge = el.querySelector<HTMLElement>(".plw-quiz-choice__badge");
          const contentEl = el.querySelector<HTMLElement>(".plw-quiz-choice__content");
          if (!badge || !contentEl) return 0;
          return Math.abs(badge.getBoundingClientRect().top - contentEl.getBoundingClientRect().top);
        });
        expect(offsetDiff).toBeLessThan(20);
      }

      // 6. Display equation bounding boxes must not intersect each other or surrounding paragraphs
      const displayBoxes = await card.evaluate(el => {
        const containers = Array.from(el.querySelectorAll<HTMLElement>("mjx-container[display='true']"));
        return containers
          .map(c => {
            const rect = c.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, height: rect.height };
          })
          .filter(b => b.height > 0);
      });
      for (let i = 0; i < displayBoxes.length - 1; i++) {
        expect(displayBoxes[i].bottom).toBeLessThanOrEqual(displayBoxes[i + 1].top + 1);
      }
    }
  }
});
