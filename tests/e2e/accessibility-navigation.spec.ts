import { expect, test } from "@playwright/test";

const base = "/Physics-Learning-Wiki/";

for (const width of [390, 768, 1100, 1219]) {
  test(`drawer content stays in view at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(base);
    const menu = page.getByRole("button", { name: "打开菜单", exact: true });
    const close = page.getByRole("button", { name: "关闭菜单", exact: true });
    const navigation = page.locator("#plw-navigation");
    const scrollwrap = page.locator(".md-sidebar--primary .md-sidebar__scrollwrap");

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await menu.click();
      // Wait for the content (not just its container) to finish sliding into view.
      await expect.poll(() => navigation.evaluate(element => element.getBoundingClientRect().left)).toBe(0);
      await expect(close).toBeFocused();
      await expect(close).toBeInViewport();
      await expect(navigation).toBeInViewport();
      await expect.poll(() => scrollwrap.evaluate(element => element.scrollLeft)).toBe(0);
      if (attempt === 0) await page.screenshot({ path: test.info().outputPath("drawer.png") });
      // Shift+Tab must not focus a translated, collapsed submenu outside the drawer.
      await close.press("Shift+Tab");
      await expect.poll(() => scrollwrap.evaluate(element => element.scrollLeft)).toBe(0);
      const focusInsideDrawer = await page.locator(".md-sidebar--primary").evaluate(sidebar => {
        const focus = document.activeElement!.getBoundingClientRect();
        const bounds = sidebar.getBoundingClientRect();
        return sidebar.contains(document.activeElement) && focus.left >= bounds.left && focus.right <= bounds.right;
      });
      expect(focusInsideDrawer).toBe(true);
      await close.click();
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await expect(menu).toBeFocused();
    }

    await menu.click();
    await expect.poll(() => navigation.evaluate(element => element.getBoundingClientRect().left)).toBe(0);
    await expect(close).toBeInViewport();
    await navigation.getByRole("link", { name: "数学符号表", exact: true }).click();
    await expect(page).toHaveURL(`${base}intro/symbol/`);
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await menu.click();
    await expect.poll(() => navigation.evaluate(element => element.getBoundingClientRect().left)).toBe(0);
    await expect(close).toBeFocused();
    await expect(close).toBeInViewport();
    await expect.poll(() => scrollwrap.evaluate(element => element.scrollLeft)).toBe(0);
  });
}

test("drawer remains usable after resizing from desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base);
  await expect(page.locator("#plw-navigation")).toBeInViewport();
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.getByRole("button", { name: "打开菜单", exact: true }).click();
  await expect(page.getByRole("button", { name: "关闭菜单", exact: true })).toBeInViewport();
  await expect
    .poll(() => page.locator(".md-sidebar--primary .md-sidebar__scrollwrap").evaluate(element => element.scrollLeft))
    .toBe(0);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator("#plw-navigation")).toBeInViewport();
  await expect(page.locator(".md-sidebar--primary")).not.toHaveAttribute("inert", "");
});

test("mobile menu and search work from the keyboard and return focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  const menu = page.getByRole("button", { name: "打开菜单", exact: true });
  await menu.focus();
  await menu.press("Enter");
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".md-sidebar--primary")).not.toHaveAttribute("inert", "");
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toBeFocused();
  const search = page.getByRole("button", { name: "打开搜索", exact: true });
  await search.focus();
  await search.press("Space");
  await expect(page.getByRole("textbox", { name: "搜索", exact: true })).toBeFocused();
  await expect(search).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(search).toHaveAttribute("aria-expanded", "false");
  await expect(search).toBeFocused();
});

test("dark article links meet contrast and Copilot does not occupy the header", async ({ page }) => {
  await page.goto(`${base}courses/`);
  await page.locator('header label[title="切换至浅色模式"]').click();
  await page.locator('header label[title="切换至深色模式"]').click();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(30, 33, 41)");
  await expect
    .poll(() =>
      page
        .locator(".page-copyright a")
        .first()
        .evaluate(link => getComputedStyle(link).color)
    )
    .toBe("rgb(154, 170, 255)");
  const contrast = await page.getByRole("link", { name: "查看理论力学阅读参考", exact: true }).evaluate(link => {
    const rgb = (value: string) =>
      value
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
    const luminance = (channels: number[]) =>
      channels
        .map(c => c / 255)
        .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
    const foreground = luminance(rgb(getComputedStyle(link).color));
    const background = luminance(rgb(getComputedStyle(document.body).backgroundColor));
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  await expect(page.locator('header a[href="https://github.com/copilot"]')).toHaveCount(0);
  await page.goto(base);
  await expect
    .poll(() =>
      page
        .locator("main article")
        .getByRole("link", { name: "数学工具", exact: true })
        .evaluate(link => getComputedStyle(link).color)
    )
    .toBe("rgb(154, 170, 255)");
});
