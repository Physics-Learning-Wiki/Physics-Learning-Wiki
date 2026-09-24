import { expect, test, type Page } from "@playwright/test";

const basePath = "/Physics-Learning-Wiki/";
const cssPath = "/assets/stylesheets/mathjax.css";

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
  await expect(page.locator("mjx-assistive-mml").first()).toBeAttached();
  await expect(page.locator(".arithmatex")).toHaveCount(0);
}

async function readMathCssUrls(page: Page): Promise<{ linkUrl: string; featureUrl: string }> {
  await expect(page.locator('link[rel="stylesheet"][href*="mathjax.css"]')).toHaveCount(1);
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

test("instant navigation loads MathJax CSS once from an ordinary page", async ({ page }) => {
  const mathCssRequests: string[] = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname.endsWith(cssPath)) mathCssRequests.push(request.url());
  });

  await page.goto(`${basePath}intro/about/`);
  await expect(page.locator("article.md-content__inner.md-typeset")).toBeVisible();
  expect(mathCssRequests).toEqual([]);

  await navigateByInstantLink(page, "modern/general-relativity/");
  await expectMathPageReady(page);
  await expect.poll(() => mathCssRequests.length).toBe(1);
  const firstCssUrls = await readMathCssUrls(page);
  expect(firstCssUrls.linkUrl).toBe(firstCssUrls.featureUrl);
  expect(firstCssUrls.linkUrl).toMatch(/[?&]hash=[a-f0-9]{64}$/);

  await navigateByInstantLink(page, "thermodynamics/chapter-1/gas/");
  await expectMathPageReady(page);
  await expect.poll(() => mathCssRequests.length).toBe(1);
  const nextCssUrls = await readMathCssUrls(page);
  expect(nextCssUrls.linkUrl).toBe(firstCssUrls.linkUrl);
  expect(nextCssUrls.featureUrl).toBe(firstCssUrls.featureUrl);
});

test("a direct math entry keeps one versioned MathJax stylesheet across instant navigation", async ({ page }) => {
  const mathCssRequests: string[] = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname.endsWith(cssPath)) mathCssRequests.push(request.url());
  });

  await page.goto(`${basePath}modern/general-relativity/`);
  await expectMathPageReady(page);
  await expect.poll(() => mathCssRequests.length).toBe(1);
  const firstCssUrls = await readMathCssUrls(page);
  expect(firstCssUrls.linkUrl).toBe(firstCssUrls.featureUrl);

  await navigateByInstantLink(page, "thermodynamics/chapter-1/gas/");
  await expectMathPageReady(page);
  await expect.poll(() => mathCssRequests.length).toBe(1);
  const nextCssUrls = await readMathCssUrls(page);
  expect(nextCssUrls.linkUrl).toBe(firstCssUrls.linkUrl);
  expect(nextCssUrls.featureUrl).toBe(firstCssUrls.featureUrl);
});
