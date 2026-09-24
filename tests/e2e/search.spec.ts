import { expect, test } from "@playwright/test";

const basePath = "/Physics-Learning-Wiki/";

test("Pagefind loads on the first search and returns Chinese results under the site subpath", async ({ page }) => {
  const pagefindRequests: string[] = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname.includes("/pagefind/")) pagefindRequests.push(request.url());
  });

  await page.goto(`${basePath}intro/about/`);
  expect(await page.locator("html").getAttribute("lang")).toBe("zh");
  expect(pagefindRequests).toEqual([]);

  const input = page.locator(".md-search__input");
  await input.fill("牛顿");
  await expect(page.locator(".md-search-result__meta")).toHaveText(/找到 \d+ 条结果/);
  const firstResult = page.locator(".md-search-result__link").first();
  await expect(firstResult).toBeVisible();
  await expect(firstResult).toHaveAttribute("href", /\/Physics-Learning-Wiki\//);
  expect(pagefindRequests.some(url => url.includes("/pagefind/pagefind.js"))).toBe(true);

  await input.press("Enter");
  await expect(page).toHaveURL(/\/Physics-Learning-Wiki\//);
  await expect(page.locator("article.md-content__inner.md-typeset")).toBeVisible();
});

test("search supports q deep links, keyboard navigation, and reset", async ({ page }) => {
  await page.goto(`${basePath}intro/about/?q=%E7%89%9B%E9%A1%BF`);
  const input = page.locator(".md-search__input");
  await expect(input).toHaveValue("牛顿");
  await expect(page.locator(".md-search-result__meta")).toHaveText(/找到 \d+ 条结果/);

  await input.focus();
  await input.press("s");
  await expect(input).toHaveValue("牛顿s");
  await input.fill("热力学");
  await expect(page.locator(".md-search-result__meta")).toHaveText(/找到 \d+ 条结果/);

  await input.press("ArrowDown");
  await expect(page.locator(".md-search-result__link").first()).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(input).toBeFocused();

  await page.locator('.md-search__options button[type="reset"]').click();
  await expect(input).toHaveValue("");
  await expect(page.locator(".md-search-result__meta")).toHaveText("输入关键词开始搜索");

  await page.keyboard.press("Escape");
  await expect(page.locator("#__search")).not.toBeChecked();
});

test("math page search excerpts omit raw TeX commands", async ({ page }) => {
  await page.goto(`${basePath}intro/about/`);
  const input = page.locator(".md-search__input");
  await input.fill("能动量张量");
  await expect(page.locator(".md-search-result__meta")).toHaveText(/找到 \d+ 条结果/);

  const result = page.locator('.md-search-result__link[href*="/modern/general-relativity/"]').first();
  await expect(result).toBeVisible();
  await expect(result.locator(".md-search-result__teaser")).toContainText("度规");
  await expect(result.locator(".md-search-result__teaser")).not.toContainText(/\\(?:frac|dfrac|begin|mathbf)/);
});

test("404 retains working search and is excluded from its own results on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${basePath}page-that-does-not-exist/`);
  const searchButton = page.locator('label[for="__search"]').first();
  await searchButton.click();

  const input = page.locator(".md-search__input");
  await expect(input).toBeVisible();
  await input.fill("麦克斯韦");
  await expect(page.locator(".md-search-result__meta")).toHaveText(/找到 \d+ 条结果/);

  const resultLinks = page.locator(".md-search-result__link");
  await expect(resultLinks.first()).toBeVisible();
  for (const href of await resultLinks.evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href))) {
    expect(href).not.toContain("404.html");
    expect(href).toContain("/Physics-Learning-Wiki/");
  }
});
