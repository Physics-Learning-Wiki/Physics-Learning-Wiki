import { expect, test } from "@playwright/test";
import { parse } from "node-html-parser";

const base = "/Physics-Learning-Wiki/";
const newton = `${base}mechanics/dynamics/newton-laws/`;
const oscillation = `${base}mechanics/oscillation-wave/linear-oscillation/`;

test("pilot concepts, prerequisites, math and quiz coexist across instant navigation", async ({ page }) => {
  const documents: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents.push(request.url());
  });
  const sitemapReady = page.waitForResponse(response => new URL(response.url()).pathname.endsWith("/sitemap.xml"));
  await page.goto(newton);
  await sitemapReady;
  const prereqs = page.getByRole("navigation", { name: "本页需要" });
  await expect(prereqs.getByRole("link")).toHaveText(["导数"]);
  const payload = await page
    .locator("template[data-plw-concepts]")
    .evaluate((el: HTMLTemplateElement) => el.content.textContent);
  expect(Object.keys(JSON.parse(payload!)).sort()).toEqual(["derivative", "inertial-frame", "momentum"]);
  await expect(page.locator("article .arithmatex, article mjx-container").first()).toBeAttached();
  await expect(page.locator(".plw-quiz-footer-card")).toHaveCount(2);
  await page.locator('a[data-plw-concept-ready][data-plw-concept="inertial-frame"]').click();
  const panel = page.getByRole("dialog", { name: "惯性参考系" });
  await expect(panel.getByRole("heading")).toHaveText("惯性参考系");
  await expect(page).toHaveURL(newton);
  await panel.getByRole("link", { name: "阅读完整内容" }).click();
  await expect(page).toHaveURL(/mechanics\/kinematics\/reference-frames\/$/);
  await expect(page.locator(".plw-concept-popover")).toHaveCount(0);
  expect(documents).toHaveLength(1);
  await page.goBack();
  await expect(page).toHaveURL(newton);
  await expect(page.locator("a[data-plw-concept-ready]")).toHaveCount(3);
  await page.locator('a[data-plw-concept-ready][data-plw-concept="inertial-frame"]').click();
  await expect(panel).toBeVisible();
  await expect(panel).toHaveCSS("position", "fixed");
  await expect(panel).toHaveCSS("border-top-left-radius", "10px");
  await page.keyboard.press("Escape");
  await page.getByRole("navigation", { name: "本页需要" }).getByRole("link", { name: "导数" }).click();
  await expect(page).toHaveURL(/math\/calculus\/derivative\/$/);
  await expect(page.locator(".plw-concept-popover")).toHaveCount(0);
  expect(documents).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("oscillation links work without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(oscillation);
  await expect(page.getByRole("navigation", { name: "本页需要" }).getByRole("link")).toHaveText(["导数", "微分方程"]);
  await page.locator('a[data-plw-concept="differential-equation"]').click();
  await expect(page).toHaveURL(/math\/differential-equations\/ode-intro\/$/);
  await context.close();
});

test("generated glossary preserves groups and remains direct navigation only", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  await page.goto(`${base}glossary/glossary/`);
  const article = page.locator("article");
  for (const id of ["a", "e", "b", "d", "g", "w"]) await expect(article.locator(`[id="${id}"]`)).toBeAttached();
  for (const name of ["导数", "动量", "惯性参考系", "微分方程"]) {
    await expect(
      article
        .locator("li")
        .filter({ has: page.locator("strong", { hasText: name }) })
        .first()
    ).toContainText("正文");
  }
  await expect(article.locator("[data-plw-concept], [data-plw-concepts]")).toHaveCount(0);
  expect(requests.filter(url => /features\/concept-reference\.(js|css)/.test(url))).toEqual([]);
  expect(await article.innerHTML()).not.toContain("plw:glossary-entry");
});

test("ordinary and prerequisite-only pages do not load the feature", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  // Use real built markup but remove inline references, as a page authored
  // with prerequisites only would be emitted by the compiler.
  await page.route(`**${newton}`, async route => {
    const response = await route.fetch();
    const body = parse(await response.text());
    body.querySelectorAll('link[data-plw-feature="concept-reference"]').forEach(link => link.remove());
    body.querySelectorAll("a[data-plw-concept]").forEach(link => link.removeAttribute("data-plw-concept"));
    body.querySelectorAll("template[data-plw-concepts]").forEach(data => data.remove());
    const article = body.querySelector("article")!;
    article.setAttribute(
      "data-plw-features",
      (article.getAttribute("data-plw-features") ?? "")
        .split(/\s+/)
        .filter(feature => feature !== "concept-reference")
        .join(" ")
    );
    await route.fulfill({ response, body: body.toString() });
  });
  await page.goto(newton);
  await expect(page.getByRole("navigation", { name: "本页需要" })).toBeVisible();
  await page.goto(`${base}intro/about/`);
  await expect(page.locator("article")).toBeVisible();
  expect(requests.filter(url => /features\/concept-reference\.(js|css)/.test(url))).toEqual([]);
});
