import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const base = "/Physics-Learning-Wiki/";
const fixture = `${base}__concept-fixture/`;
const destination = `${base}__concept-destination/`;
const values = {
  derivative: { name: "导数", english: "Derivative", summary: "描述局部变化率。", href: destination },
  momentum: { name: "动量", english: "", summary: "动量是矢量。<b>保持纯文本</b>", href: destination }
};

function article(data = values) {
  return `<article class="md-content__inner md-typeset" data-plw-features="concept-reference">
    <h1>概念测试</h1>
    <a href="${destination}" data-plw-concept="derivative">导数</a>
    <a href="${destination}" data-plw-concept="derivative">再次引用导数</a>
    <a href="${destination}" data-plw-concept="momentum">动量</a>
    <button id="outside">外部按钮</button>
    <script type="application/json" data-plw-concepts>${JSON.stringify(data).replace(/</g, "\\u003c")}</script>
  </article>`;
}

async function setup(
  page: Page,
  options: { invalid?: boolean; long?: boolean; failure?: "js" | "css"; unsupported?: boolean } = {}
) {
  if (options.unsupported) {
    await page.addInitScript(() => Object.defineProperty(HTMLElement.prototype, "showPopover", { value: undefined }));
  }
  await page.route(`${base}__concept-destination/`, route =>
    route.fulfill({ contentType: "text/html", body: "<h1>目标页面</h1>" })
  );
  await page.route(`**${base}_static/**`, async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (options.failure && pathname.endsWith(`concept-reference.${options.failure}`)) return route.abort();
    const relative = pathname.slice(base.length);
    const body = await readFile(`docs/${relative}`);
    await route.fulfill({ contentType: pathname.endsWith(".css") ? "text/css" : "text/javascript", body });
  });
  const data = structuredClone(values);
  if (options.long) data.derivative.summary = "很长的解释，需要滚动查看。".repeat(150);
  let content = article(data);
  if (options.invalid) content = content.replace('"summary":"描述局部变化率。"', '"summary":null');
  await page.route(`**${fixture}`, route =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
      <script id="__config" type="application/json">{"base":"${base}"}</script>
      <style>body{margin:16px;font:16px sans-serif}a{display:inline-block;margin:8px}button{min-height:44px}</style>
      </head><body>${content}
      <script>window.document$={subscribe(callback){window.fixtureMount=callback;callback(document);return ()=>{}}};
      document.body.addEventListener('click', e => { if(e.target.closest('a[data-plw-concept]')) window.leakedClicks=(window.leakedClicks||0)+1; });</script>
      <script type="module" src="${base}_static/js/runtime-loader.js"></script></body></html>`
    })
  );
  await page.goto(fixture);
}

test("single popover, repeated references, literal content and no navigation leak", async ({ page }) => {
  await setup(page);
  const refs = page.locator("a[data-plw-concept-ready]");
  await expect(refs).toHaveCount(3);
  await refs.first().hover();
  const panel = page.getByRole("dialog");
  await expect(panel).toBeHidden();
  await refs.first().click();
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading")).toHaveText("导数");
  await expect(refs.first()).toHaveAttribute("aria-expanded", "true");
  await expect(page).toHaveURL(fixture);
  expect(await page.evaluate(() => (window as any).leakedClicks ?? 0)).toBe(0);
  await refs.nth(1).click();
  await expect(panel).toBeVisible();
  await expect(refs.first()).toHaveAttribute("aria-expanded", "false");
  await expect(refs.nth(1)).toHaveAttribute("aria-expanded", "true");
  await refs.nth(1).click();
  await expect(panel).toBeHidden();
  await refs.nth(2).click();
  await expect(panel).toContainText("<b>保持纯文本</b>");
  await expect(panel.locator("b")).toHaveCount(0);
  await expect(panel.locator(".plw-concept-english")).toBeHidden();
  await panel.getByRole("link", { name: "阅读完整内容" }).click();
  await expect(page).toHaveURL(destination);
});

test("keyboard activation, closing and external focus", async ({ page }) => {
  await setup(page);
  const ref = page.locator("a[data-plw-concept-ready]").first();
  await expect(ref).toBeVisible();
  await ref.focus();
  await page.keyboard.press("Enter");
  const panel = page.getByRole("dialog");
  await expect(panel.getByRole("heading")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(panel.getByRole("link")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(ref).toBeFocused();
  await page.keyboard.press("Enter");
  await panel.getByRole("button", { name: "关闭概念解释" }).click();
  await expect(ref).toBeFocused();
  await page.keyboard.press("Enter");
  await page.locator("#outside").click();
  await expect(panel).toBeHidden();
  await expect(page.locator("#outside")).toBeFocused();
});

test("modified and middle clicks retain link defaults", async ({ page }) => {
  await setup(page);
  const ref = page.locator("a[data-plw-concept-ready]").first();
  await expect(ref).toBeVisible();
  const canceled = await ref.evaluate(element => {
    return [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }].map(modifier => {
      const event = new MouseEvent("click", { bubbles: true, cancelable: true, ...modifier });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    });
  });
  expect(canceled).toEqual([false, false, false, false, false]);
});

for (const option of [
  { unsupported: true },
  { invalid: true },
  { failure: "js" as const },
  { failure: "css" as const }
]) {
  test(`failed enhancement preserves navigation: ${JSON.stringify(option)}`, async ({ page }) => {
    await setup(page, option);
    await expect(page.locator("[data-plw-concept-ready]")).toHaveCount(0);
    await page.locator("a[data-plw-concept]").first().click();
    await expect(page).toHaveURL(destination);
  });
}

test("links navigate with JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await setup(page);
  await page.locator("a[data-plw-concept]").first().click();
  await expect(page).toHaveURL(destination);
  await context.close();
});

test("narrow touch viewport keeps long content usable", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await setup(page, { long: true });
  await page.locator("a[data-plw-concept-ready]").first().tap();
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(360);
  expect(box!.y + box!.height).toBeLessThanOrEqual(640);
  expect(await panel.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await panel.getByRole("link").scrollIntoViewIfNeeded();
  await expect(panel.getByRole("link")).toBeInViewport();
  await context.close();
});

test("page lifecycle disposes panels and supports remounting cached modules", async ({ page }) => {
  await setup(page);
  await page.locator("a[data-plw-concept-ready]").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate(() => {
    document.querySelector("article")!.outerHTML = '<article class="md-content__inner md-typeset">普通页面</article>';
    (window as any).fixtureMount(document);
  });
  await expect(page.locator(".plw-concept-popover")).toHaveCount(0);
  await page.evaluate(markup => {
    document.querySelector("article")!.outerHTML = markup;
    (window as any).fixtureMount(document);
    (window as any).fixtureMount(document);
  }, article());
  await expect(page.locator("[data-plw-concept-ready]")).toHaveCount(3);
  await expect(page.locator(".plw-concept-popover")).toHaveCount(1);
  await page.locator("a[data-plw-concept-ready]").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("late feature load cannot attach to an obsolete article", async ({ page }) => {
  await setup(page);
  await expect(page.locator("[data-plw-concept-ready]")).toHaveCount(3);
  // A fresh runtime has an uncached module promise, held until navigation.
  await page.route("**/features/concept-reference.js", async route => {
    await page.waitForFunction(() => document.querySelector("article")?.textContent === "下一页");
    await route.fulfill({
      contentType: "text/javascript",
      body: await readFile("docs/_static/js/features/concept-reference.js")
    });
  });
  const requested = page.waitForRequest("**/features/concept-reference.js");
  await page.reload({ waitUntil: "domcontentloaded" });
  await requested;
  await page.waitForFunction(() => typeof (window as any).fixtureMount === "function");
  await page.evaluate(() => {
    document.querySelector("article")!.outerHTML = '<article class="md-content__inner md-typeset">下一页</article>';
    (window as any).fixtureMount(document);
  });
  await page.evaluate(async () => {
    await import("/Physics-Learning-Wiki/_static/js/features/concept-reference.js");
    await new Promise(requestAnimationFrame);
  });
  await expect(page.locator(".plw-concept-popover")).toHaveCount(0);
});
