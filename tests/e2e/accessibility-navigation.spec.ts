import { expect, test } from "@playwright/test";

const base = "/Physics-Learning-Wiki/";
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
  await page.getByRole("button", { name: "查找知识", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "查找知识", exact: true })).toBeFocused();
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
  const contrast = await page.getByRole("link", { name: "进入理论力学路线", exact: true }).evaluate(link => {
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
    // Use a regular article link, rather than the filled primary action.
    const sample = document.querySelector<HTMLAnchorElement>(".page-copyright a")!;
    const foreground = luminance(rgb(getComputedStyle(sample).color));
    const background = luminance(rgb(getComputedStyle(document.body).backgroundColor));
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  await expect(page.locator('header a[href="https://github.com/copilot"]')).toHaveCount(0);
});
