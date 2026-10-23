import { expect, test } from "@playwright/test";
import { mockTopicCatalogs } from "./helpers/topic-catalogs.js";

const base = "/Physics-Learning-Wiki/quiz/";

test("question topics aggregate branches, cascade concepts and reset chips and pagination", async ({ page }) => {
  await mockTopicCatalogs(page);
  await page.goto(base + "questions/");
  const topic = page.getByRole("combobox", { name: "主题", exact: true });
  const child = page.getByRole("combobox", { name: "子主题", exact: true });
  const concept = page.getByRole("combobox", { name: "概念", exact: true });
  const cards = page.locator(".plw-quiz-question-browser__card");
  const count = page.locator(".plw-quiz-sets__count-notice");
  await expect(topic.locator("option")).toHaveText(["所有主题", "电磁学", "经典力学"]);
  await expect(child).toBeDisabled();
  await expect(count).toContainText("15 道");
  await expect(cards).toHaveCount(10);
  await page.locator(".plw-quiz-question-browser__load-more").click();
  await expect(cards).toHaveCount(15);

  await topic.selectOption("mechanics");
  await expect(count).toContainText("14 道");
  await expect(cards).toHaveCount(10);
  await expect(child.locator("option")).toHaveText(["全部子主题", "动力学", "运动学", "动力学 / 进阶动力学"]);
  await expect(concept.locator("option")).toHaveText(["所有核心概念", "运动", "速度", "惯性"]);
  await concept.selectOption("common.motion");
  await child.selectOption("mechanics.dynamics");
  await expect(concept).toHaveValue("common.motion");
  await expect(count).toContainText("13 道");
  await concept.selectOption("newton.inertia");
  await child.selectOption("mechanics.kinematics");
  await expect(concept).toHaveValue("all");
  await expect(count).toContainText("1 道");
  await expect(concept.locator('option[value="newton.inertia"]')).toHaveCount(0);

  await page.locator('[data-clear-filter="subtopic"]').click();
  await expect(topic).toHaveValue("mechanics");
  await expect(child).toHaveValue("all");
  await expect(count).toContainText("14 道");
  await child.selectOption("mechanics.dynamics");
  await page.locator('[data-clear-filter="topic"]').click();
  await expect(topic).toHaveValue("all");
  await expect(child).toBeDisabled();
  await page.locator("#plw-filter-keyword").fill("nothing-matches");
  await expect(cards).toHaveCount(0);
  await expect(topic.locator("option")).toHaveCount(3);
  await page.locator("#plw-btn-reset-filters").click();
  await expect(count).toContainText("15 道");
  await expect(child).toBeDisabled();
});

test("set topics match fixed contents and query candidates without admitting sibling branches", async ({ page }) => {
  await mockTopicCatalogs(page);
  await page.goto(base + "sets/");
  const topic = page.getByRole("combobox", { name: "主题", exact: true });
  const child = page.getByRole("combobox", { name: "子主题", exact: true });
  const titles = page.locator(".plw-quiz-landing__card h3");
  await expect(topic.locator("option")).toHaveText(["所有主题", "电磁学", "经典力学"]);
  await expect(child).toBeDisabled();
  await topic.selectOption("mechanics");
  await expect(titles).toHaveText(["mechanics.fixed", "mechanics.query"]);
  await child.selectOption("mechanics.kinematics");
  await expect(titles).toHaveText(["mechanics.fixed"]);
  await expect(page.locator(".plw-quiz-filter-bar summary")).toContainText("2 项已启用");
  await child.selectOption("mechanics.dynamics");
  await expect(titles).toHaveText(["mechanics.fixed", "mechanics.query"]);
  await page.locator("#plw-select-mode").selectOption("immediate");
  await expect(titles).toHaveText(["mechanics.query"]);
  await topic.selectOption("electromagnetism");
  await expect(child).toHaveValue("all");
  await expect(titles).toHaveCount(0);
  await page.locator("#plw-btn-reset-sets-filters").click();
  await expect(titles).toHaveCount(3);
  await expect(child).toBeDisabled();
});

test("preview includes draft-only branches and mobile controls remain reachable by keyboard", async ({ page }) => {
  await mockTopicCatalogs(page, { preview: true });
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(base + "questions/");
  const topic = page.getByRole("combobox", { name: "主题", exact: true });
  const child = page.getByRole("combobox", { name: "子主题", exact: true });
  await expect(topic.locator('option[value="optics"]')).toHaveText("光学");
  await topic.selectOption("optics");
  await expect(page.locator(".plw-quiz-sets__count-notice")).toContainText("1 道");
  await topic.focus();
  await page.keyboard.press("Tab");
  await expect(child).toBeFocused();
  const overflows = await page.locator(".plw-quiz-filter-bar > .plw-quiz-filter-row").evaluate(element => {
    return element.scrollWidth > element.clientWidth + 1 || element.getBoundingClientRect().right > innerWidth;
  });
  expect(overflows).toBe(false);
  await page.goto(base + "sets/");
  await page.locator(".plw-quiz-filter-bar summary").click();
  await page.locator("#plw-select-topic").selectOption("optics");
  await expect(page.locator(".plw-quiz-landing__card h3")).toContainText("optics.draft");
});

test("taxonomy failure leaves both catalogs and their other filters usable", async ({ page }) => {
  await mockTopicCatalogs(page, { failTaxonomy: true });
  for (const surface of ["questions", "sets"]) {
    await page.goto(base + surface + "/");
    await expect(page.getByRole("combobox", { name: "主题", exact: true })).toBeDisabled();
    await expect(page.getByRole("combobox", { name: "子主题", exact: true })).toBeDisabled();
    await expect(page.locator(".plw-quiz-search-input")).toBeEnabled();
    await page.locator(".plw-quiz-search-input").fill("nothing-matches");
    await expect(page.locator(".plw-quiz-empty")).toBeVisible();
  }
});
