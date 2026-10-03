import { expect, test } from "@playwright/test";

const basePath = "/Physics-Learning-Wiki/";

test("all results and matching sections remain reachable with readable metadata", async ({ page }) => {
  await page.route("**/pagefind/pagefind.js", route =>
    route.fulfill({
      contentType: "text/javascript",
      body: `export const options=async()=>{}, init=async()=>{};
      export const search=async query=>({results:Array.from({length:23},(_,i)=>({data:async()=>({
        url:'/Physics-Learning-Wiki/mechanics/?item='+i,
        meta:{title:query+' '+i,kind:'知识正文',breadcrumb:'经典力学 › 动力学',description:'理解惯性和力'},
        excerpt:'d^2 ud x^2Delta',
        sub_results:i?[]:Array.from({length:6},(_,j)=>({url:'/Physics-Learning-Wiki/mechanics/#part'+j,title:'章节 '+j}))
      })}))});`
    })
  );
  await page.goto(`${basePath}intro/about/`);
  await page.locator(".md-search__input").fill("牛顿");
  const items = page.locator(".md-search-result__list > li");
  await expect(items).toHaveCount(10);
  await expect(page.locator(".md-search-result__meta")).toHaveText("已显示 10 条，共 23 条");
  await expect(items.first().locator(".plw-search-context")).toContainText("经典力学 › 动力学");
  await expect(items.first()).not.toContainText("d^2 ud");
  await items.first().locator("summary").click();
  await expect(items.first().locator("details a")).toHaveCount(6);
  await page.getByRole("button", { name: "加载更多", exact: true }).click();
  await expect(items).toHaveCount(20);
  await page.getByRole("button", { name: "加载更多", exact: true }).click();
  await expect(items).toHaveCount(23);
  await expect(page.getByRole("button", { name: "加载更多", exact: true })).toBeHidden();
});

test("a failed next batch can retry without discarding earlier results or appending stale queries", async ({
  page
}) => {
  await page.route("**/pagefind/pagefind.js", route =>
    route.fulfill({
      contentType: "text/javascript",
      body: `
    let failed=false;
    export const options=async()=>{}, init=async()=>{};
    export const search=async query=>({results:Array.from({length:11},(_,i)=>({data:async()=>{
      if(query==='旧查询'&&i===10&&!failed){failed=true;throw Error('fixture failure')}
      if(query==='旧查询'&&i===10)await new Promise(r=>setTimeout(r,400));
      return {url:'/Physics-Learning-Wiki/mechanics/?item='+i,meta:{title:query+' '+i}};
    }}))});`
    })
  );
  await page.goto(`${basePath}intro/about/`);
  const input = page.locator(".md-search__input");
  const items = page.locator(".md-search-result__list > li");
  await input.fill("旧查询");
  await expect(items).toHaveCount(10);
  await page.getByRole("button", { name: "加载更多", exact: true }).click();
  await expect(page.getByRole("button", { name: "重试", exact: true })).toBeVisible();
  await expect(items).toHaveCount(10);
  await page.getByRole("button", { name: "重试", exact: true }).click();
  await input.fill("新查询");
  await expect(items.first()).toContainText("新查询");
  await expect(items).toHaveCount(10);
  await page.getByRole("button", { name: "加载更多", exact: true }).click();
  await expect(items).toHaveCount(11);
  await expect(items).not.toContainText(["旧查询"]);
});

test("Pagefind loads on the first search and returns Chinese results under the site subpath", async ({ page }) => {
  const pagefindRequests: string[] = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname.includes("/pagefind/")) pagefindRequests.push(request.url());
  });

  await page.goto(`${basePath}intro/about/`);
  expect(await page.locator("html").getAttribute("lang")).toBe("zh-Hans");
  expect(pagefindRequests).toEqual([]);

  const input = page.locator(".md-search__input");
  await input.fill("牛顿");
  await expect(page.locator(".md-search-result__meta")).toHaveText(/已显示 \d+ 条，共 \d+ 条/);
  const firstResult = page.locator(".md-search-result__link").first();
  await expect(firstResult).toBeVisible();
  await expect(firstResult).toHaveAttribute("href", /\/Physics-Learning-Wiki\//);
  expect(pagefindRequests.some(url => url.includes("/pagefind/pagefind.js"))).toBe(true);
  expect(pagefindRequests.filter(url => new URL(url).pathname.endsWith("/pagefind/pagefind.js"))).toHaveLength(1);
  expect(pagefindRequests.every(url => new URL(url).pathname.startsWith(`${basePath}pagefind/`))).toBe(true);

  await input.press("Enter");
  await expect(page).toHaveURL(/\/Physics-Learning-Wiki\//);
  await expect(page.locator("article.md-content__inner.md-typeset")).toBeVisible();
});

test("search supports q deep links, keyboard navigation, and reset", async ({ page }) => {
  await page.goto(`${basePath}intro/about/?q=%E7%89%9B%E9%A1%BF`);
  const input = page.locator(".md-search__input");
  await expect(input).toHaveValue("牛顿");
  await expect(page.locator(".md-search-result__meta")).toHaveText(/已显示 \d+ 条，共 \d+ 条/);

  await input.focus();
  await input.press("s");
  await expect(input).toHaveValue("牛顿s");
  await input.fill("热力学");
  await expect(page.locator(".md-search-result__meta")).toHaveText(/已显示 \d+ 条，共 \d+ 条/);

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

test("desktop search expands on focus and shows Pagefind results", async ({ page }) => {
  await page.setViewportSize({ width: 1796, height: 1294 });
  await page.goto(`${basePath}thermodynamics/chapter-1/heat-and-its-nature/`);

  const input = page.locator(".md-search__input");
  const toggle = page.locator("#__search");
  const searchInner = page.locator(".md-search__inner");
  const collapsedWidth = await searchInner.evaluate(element => element.getBoundingClientRect().width);
  await expect(toggle).not.toBeChecked();
  await input.click();
  await expect(toggle).toBeChecked();
  await expect
    .poll(async () => searchInner.evaluate(element => element.getBoundingClientRect().width))
    .toBeGreaterThan(collapsedWidth + 100);

  await input.fill("热学");
  await expect(page.locator(".md-search-result__meta")).toHaveText(/已显示 \d+ 条，共 \d+ 条/);
  await expect(page.locator(".md-search-result__link").first()).toBeVisible();
});

test("404 retains working search and is excluded from its own results on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const legacySearchRequests: string[] = [];
  page.on("request", request => {
    const pathname = new URL(request.url()).pathname;
    if (/\/search_index\.json$|\/workers\/search\.[^/]+\.min\.js$/i.test(pathname)) {
      legacySearchRequests.push(pathname);
    }
  });
  const missingPageResponse = await page.goto(`${basePath}page-that-does-not-exist/`);
  expect(missingPageResponse?.status()).toBe(404);
  const searchButton = page.locator('label[for="__search"]').first();
  await searchButton.click();

  const input = page.locator(".md-search__input");
  await expect(input).toBeVisible();
  await input.fill("麦克斯韦");
  await expect(page.locator(".md-search-result__meta")).toHaveText(/已显示 \d+ 条，共 \d+ 条/);

  const resultLinks = page.locator(".md-search-result__link");
  await expect(resultLinks.first()).toBeVisible();
  expect(legacySearchRequests).toEqual([]);
  for (const href of await resultLinks.evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href))) {
    expect(href).not.toContain("404.html");
    expect(href).toContain("/Physics-Learning-Wiki/");
  }
});
