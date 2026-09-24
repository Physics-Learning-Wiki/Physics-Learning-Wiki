import { expect, test } from "@playwright/test";

test("Material instant navigation starts and moves between ordinary pages", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("/Physics-Learning-Wiki/intro/about/");
  await expect(page.locator("article.md-content__inner.md-typeset")).toBeVisible();
  expect(await page.locator("#__config").textContent()).toContain('"base"');
  expect(
    await page.evaluate(() => typeof (window as Window & { document$?: { subscribe?: unknown } }).document$?.subscribe)
  ).toBe("function");

  await page.getByRole("link", { name: "F.A.Q.", exact: true }).click();
  await expect(page).toHaveURL(/\/Physics-Learning-Wiki\/intro\/faq\//);
  await expect(page.locator("article.md-content__inner.md-typeset")).toBeVisible();
  expect(pageErrors).toEqual([]);
});
