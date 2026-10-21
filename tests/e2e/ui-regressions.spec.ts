import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { mockTurnstile } from "./helpers/turnstile.js";

const basePath = "/Physics-Learning-Wiki/";
const evidence = resolve("artifacts/ui-audit-2026-10-21/after");

async function setScheme(page: Page, scheme: "default" | "slate") {
  for (let attempt = 0; attempt < 3; attempt++) {
    if ((await page.locator("body").getAttribute("data-md-color-scheme")) === scheme) break;
    await page.locator(".md-header__option label:not([hidden])").click();
  }
  await expect(page.locator("body")).toHaveAttribute("data-md-color-scheme", scheme);
}

async function assertActionContrast(action: Locator) {
  await expect
    .poll(() =>
      action.evaluate(element => {
        const style = getComputedStyle(element);
        const rgb = (value: string) =>
          value
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number);
        const luminance = (value: number[]) =>
          value
            .map(channel => channel / 255)
            .map(channel => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
            .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
        let background = element;
        while (getComputedStyle(background).backgroundColor === "rgba(0, 0, 0, 0)" && background.parentElement)
          background = background.parentElement;
        const foreground = luminance(rgb(style.color));
        const backdrop = luminance(rgb(getComputedStyle(background).backgroundColor));
        return (Math.max(foreground, backdrop) + 0.05) / (Math.min(foreground, backdrop) + 0.05);
      })
    )
    .toBeGreaterThanOrEqual(4.5);
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 1000 }
]) {
  for (const scheme of ["default", "slate"] as const) {
    test(`management and edit entry remain usable at ${viewport.width}px in ${scheme}`, async ({ page }) => {
      await mockTurnstile(page);
      await page.setViewportSize(viewport);
      await page.goto(`${basePath}submission/status/`);
      await setScheme(page, scheme);
      const input = page.getByLabel("投稿编号", { exact: true });
      const query = page.getByRole("button", { name: "查询进度", exact: true });
      await expect(input).toHaveCSS("border-top-style", "solid");
      expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect((await query.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await input.focus();
      await input.press("Tab");
      await expect(query).toBeFocused();
      await assertActionContrast(query);
      await expect(page.locator("#submission-author-actions")).toBeHidden();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await mkdir(evidence, { recursive: true });
      await page.screenshot({ path: resolve(evidence, `status-${viewport.width}-${scheme}.png`), fullPage: true });

      // The configured edit link points at production; exercise local navigation separately.
      await page.getByRole("link", { name: "上一页: 投稿", exact: true }).click();
      await expect(page.locator("#submission-form .CodeMirror")).toBeVisible();
      await page.goBack();
      await expect(input).toBeVisible();
      await expect(input).toHaveCSS("border-top-style", "solid");
      await assertActionContrast(query);
      await page.goto(`${basePath}edit-landing/?ref=/submission/status.md`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("编辑与投稿入口");
      await expect(page.locator("#btn-startedit")).toHaveAttribute("href", /edit\/main\/docs\/submission\/status\.md$/);
      const actions = page.locator("article .grid .md-button");
      await expect(actions).toHaveCount(3);
      for (const action of await actions.all()) await assertActionContrast(action);
      const first = (await actions.nth(0).boundingBox())!;
      const second = (await actions.nth(1).boundingBox())!;
      if (viewport.width === 390) {
        expect(second.y).toBeGreaterThan(first.y + first.height);
        expect(second.x).toBeCloseTo(first.x, 0);
      }
      await actions.last().scrollIntoViewIfNeeded();
      await page.screenshot({ path: resolve(evidence, `edit-${viewport.width}-${scheme}.png`), fullPage: true });
      await page.goto(`${basePath}quiz/contribute/`);
      await expect(page.locator(".CodeMirror")).toHaveCount(2);
      await expect(page.getByLabel("署名名称", { exact: true })).toBeVisible();
      await expect(page.getByLabel("图片替代文本（提供图片时必填）", { exact: true })).toBeVisible();
      await expect(page.getByLabel("图片来源与版权依据（提供图片时必填）", { exact: true })).toBeVisible();
      const questionSubmit = page.getByRole("button", { name: "提交题目投稿", exact: true });
      expect((await questionSubmit.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await assertActionContrast(questionSubmit);
      await page.locator("#q-submit-type").selectOption("numeric");
      await expect(page.locator(".q-submit-choice-only").first()).toBeHidden();
      await expect(page.getByLabel("试算答案单位", { exact: true })).toBeVisible();
      await page.locator(".q-submit-numeric-only").scrollIntoViewIfNeeded();
      await page.screenshot({ path: resolve(evidence, `numeric-${viewport.width}-${scheme}.png`) });
      await page.locator("#q-submit-type").selectOption("free_response");
      await expect(page.locator("#q-submit-answer")).toBeHidden();
      await expect(page.locator(".q-submit-numeric-only")).toBeHidden();
      await expect(page.locator(".q-submit-free-only")).toBeVisible();
      await questionSubmit.scrollIntoViewIfNeeded();
      await page.screenshot({ path: resolve(evidence, `question-${viewport.width}-${scheme}.png`) });
      await page.goto(`${basePath}submit/`);
      await expect(page.locator(".CodeMirror")).toHaveCount(1);
      await expect(page.getByLabel("署名名称", { exact: true })).toBeVisible();
      await assertActionContrast(page.getByRole("button", { name: "提交投稿", exact: true }));
    });
  }
}

test("empty library has no warning, while broken local data is explained", async ({ page }) => {
  await page.goto(`${basePath}quiz/library/`);
  await expect(page.getByText("这里还没有符合条件的错题。", { exact: true })).toBeVisible();
  await expect(page.locator(".plw-quiz-library__notice")).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem("plw.quiz.v3", "{broken"));
  await page.reload();
  await expect(page.locator(".plw-quiz-library__notice")).toContainText("本地数据损坏");
});

test("warning prose wraps normally and back-to-top has a keyboard-accessible name", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${basePath}tools/simulation/`);
  const warning = page.locator("details.warning").filter({ hasText: "先确认授权和课程要求" });
  await expect(warning.locator("p")).toContainText("Mathematica 和 MATLAB 都是商业软件");
  await expect(warning.locator("pre")).toHaveCount(0);
  await warning.scrollIntoViewIfNeeded();
  await mkdir(evidence, { recursive: true });
  await page.screenshot({ path: resolve(evidence, "warning-mobile.png"), fullPage: false });
  const top = page.getByRole("button", { name: "回到顶部", exact: true });
  await expect(top).toBeVisible();
  await top.focus();
  await top.press("Enter");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test("formula indexing remains searchable without exposing duplicate formula text", async ({ page }) => {
  await page.goto(`${basePath}mechanics/dynamics/newton-laws/`);
  const indexed = page.locator(".plw-pagefind-math");
  expect(await indexed.count()).toBeGreaterThan(0);
  await expect(indexed.first()).toHaveAttribute("aria-hidden", "true");
  const snapshot = await page.locator("article").ariaSnapshot();
  expect(snapshot).not.toContain("F = dpdt");
  const hits = await page.evaluate(async () => {
    const pagefind = await import(/* @vite-ignore */ "/Physics-Learning-Wiki/pagefind/pagefind.js");
    const result = await pagefind.search("dpdt");
    const pages = await Promise.all(
      result.results.map((entry: { data: () => Promise<{ url: string }> }) => entry.data())
    );
    return pages.map((entry: { url: string }) => entry.url);
  });
  expect(hits.some((url: string) => url.includes("mechanics/dynamics/newton-laws/"))).toBe(true);
});
