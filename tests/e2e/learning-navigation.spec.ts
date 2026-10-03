import { expect, test } from "@playwright/test";

const base = "/Physics-Learning-Wiki/";
test("subject tabs lead to study introductions and submission links keep the site prefix", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base);
  const subjects = {
    经典力学: "mechanics/",
    热学与统计物理: "thermodynamics/",
    电磁学: "electromagnetism/",
    光学: "optics/",
    近代物理: "modern/"
  };
  for (const [name, route] of Object.entries(subjects)) {
    const link = page.getByRole("navigation", { name: "标签", exact: true }).getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("href", new RegExp(`${base}${route}$`));
  }
  await expect(page.locator("main article h1")).toHaveText("物理学习百科");
  await page.goto(`${base}submit/`);
  await page.locator("main article summary").getByText("补充说明", { exact: true }).click();
  const link = page.locator("main article").getByRole("link", { name: "贡献题目", exact: true });
  await expect(link).toHaveAttribute("href", /quiz\/contribute\/$/);
});

test("mobile subject links and course references are readable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  const math = page.locator("main article").getByRole("link", { name: "数学工具", exact: true });
  await expect(math).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "打开搜索", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "搜索", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await page.goto(`${base}courses/`);
  await expect(page.locator(".plw-course-card")).toHaveCount(3);
  const theory = page.getByRole("link", { name: "查看理论力学阅读参考", exact: true });
  await theory.scrollIntoViewIfNeeded();
  await expect(theory).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator("#课程路线总览")).toBeAttached();
  await page.goto(`${base}mechanics/kinematics/reference-frames/`);
  await expect(page.locator("main article h1")).toHaveCount(1);
  await expect(page.locator("main article h2").first()).not.toContainText("Reference Frames and Coordinate Systems");
  await expect(page.locator('[id="参考系与坐标系reference-frames-and-coordinate-systems"]')).toBeAttached();
});
