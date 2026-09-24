import { expect, test } from "@playwright/test";

const basePath = "/Physics-Learning-Wiki/";

test("Mermaid loads locally only on its feature page and survives instant navigation", async ({ page }) => {
  const mermaidRequests: string[] = [];
  const navigationRequests: string[] = [];
  const mermaidErrors: string[] = [];
  const runtimeErrors: string[] = [];

  page.on("request", request => {
    const url = request.url();
    if (/mermaid/i.test(url)) mermaidRequests.push(url);
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigationRequests.push(url);
  });
  page.on("console", message => {
    if (message.type() === "error") runtimeErrors.push(message.text());
    if (message.type() === "error" && /already processed|duplicate id|already exists/i.test(message.text())) {
      mermaidErrors.push(message.text());
    }
  });
  page.on("pageerror", error => runtimeErrors.push(error.message));
  const mermaidBundleRequested = page.waitForRequest(request => request.url().includes("/features/mermaid.js"));

  const sitemapReady = page.waitForResponse(response => new URL(response.url()).pathname.endsWith("/sitemap.xml"));
  await page.goto(`${basePath}intro/about/`);
  await sitemapReady;
  expect(mermaidRequests).toEqual([]);

  const mechanicsUrl = `${await page.evaluate(() => location.origin)}${basePath}mechanics/`;
  await page.evaluate(target => {
    const link = [...document.querySelectorAll<HTMLAnchorElement>("a")].find(anchor => anchor.href === target);
    if (!link) throw new Error(`No site link points to ${target}`);
    link.click();
  }, mechanicsUrl);
  await expect(page).toHaveURL(/\/Physics-Learning-Wiki\/mechanics\/$/);
  await mermaidBundleRequested;

  const sources = page.locator("article [data-plw-mermaid-source]");
  const diagrams = page.locator("article [data-plw-mermaid-source] svg");
  await expect(sources.first()).toBeAttached();
  try {
    await expect(diagrams.first()).toBeVisible({ timeout: 15_000 });
  } catch (error) {
    throw new Error(
      `${String(error)}\nBrowser errors: ${runtimeErrors.join(" | ")}\nMermaid requests: ${mermaidRequests.join(" | ")}`
    );
  }
  const sourceCount = await sources.count();
  await expect(diagrams).toHaveCount(sourceCount);
  expect(mermaidRequests.filter(url => url.includes("/features/mermaid.js"))).toHaveLength(1);
  expect(mermaidRequests.some(url => /unpkg\.com\/mermaid|jsdelivr\.net\/npm\/mermaid/i.test(url))).toBe(false);
  expect(navigationRequests).toHaveLength(1);
  expect(
    await page.evaluate(() => {
      const openMermaidShadow = () => {
        const host = document.createElement("div");
        host.className = "mermaid";
        const shadow = host.attachShadow({ mode: "closed" });
        return host.shadowRoot === shadow;
      };
      return [openMermaidShadow(), openMermaidShadow()];
    })
  ).toEqual([true, true]);

  const darkPalette = page.locator("#__palette_2");
  if (await darkPalette.count()) {
    await darkPalette.evaluate(element => {
      (element as HTMLInputElement).checked = true;
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(page.locator("body")).toHaveAttribute("data-md-color-scheme", "slate");
    await expect(diagrams).toHaveCount(sourceCount);
  }

  await page.goBack();
  await expect(page).toHaveURL(/\/Physics-Learning-Wiki\/intro\/about\/$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/Physics-Learning-Wiki\/mechanics\/$/);
  await expect(diagrams).toHaveCount(sourceCount);
  expect(mermaidRequests.filter(url => url.includes("/features/mermaid.js"))).toHaveLength(1);
  expect(mermaidErrors).toEqual([]);
});

for (const route of ["courses/", "math/", "mechanics/"]) {
  test(`direct Mermaid rendering works on ${route}`, async ({ page }) => {
    const mermaidRequests: string[] = [];
    page.on("request", request => {
      if (/mermaid/i.test(request.url())) mermaidRequests.push(request.url());
    });

    await page.goto(`${basePath}${route}`);
    const article = page.locator("article.md-content__inner.md-typeset");
    await expect(article).toHaveAttribute("data-plw-features", /(?:^|\s)mermaid(?:\s|$)/);
    const sources = article.locator("[data-plw-mermaid-source]");
    const diagrams = sources.locator("svg");
    await expect(sources.first()).toBeAttached();
    await expect(diagrams).toHaveCount(await sources.count(), { timeout: 20_000 });
    expect(mermaidRequests.filter(url => url.includes("/features/mermaid.js"))).toHaveLength(1);
    expect(mermaidRequests.some(url => /unpkg\.com\/mermaid|jsdelivr\.net\/npm\/mermaid/i.test(url))).toBe(false);
  });
}
