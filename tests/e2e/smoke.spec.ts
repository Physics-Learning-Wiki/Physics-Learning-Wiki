import { expect, test } from "@playwright/test";

const forbiddenOrdinaryPageRequests = [
  /(?:^|\/)features\/concept-reference\.(?:js|css)/i,
  /mathjax\.css/i,
  /(?:^|\/)features\/mermaid\.js/i,
  /(?:^|\/)features\/quiz\.js/i,
  /(?:^|\/)css\/quiz\.css/i,
  /(?:^|\/)features\/(?:submit|question-contribute|quiz-set-contribute|submission-status)\.(?:js|css)/i,
  /easymde/i,
  /(?:^|\/)pagefind(?:\/|\.|-)/i,
  /(?:^|\/)\_generated\/question-bank\//i
];

test("ordinary pages navigate without loading page-specific features", async ({ page }) => {
  const pageErrors: string[] = [];
  const eagerFeatureRequests: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("request", request => {
    if (forbiddenOrdinaryPageRequests.some(pattern => pattern.test(new URL(request.url()).pathname))) {
      eagerFeatureRequests.push(request.url());
    }
  });

  await page.goto("/Physics-Learning-Wiki/intro/about/");
  await expect(page.locator("article.md-content__inner.md-typeset")).toBeVisible();
  // The noindex FAQ uses regular navigation; instant transitions have dedicated coverage.
  await page.getByRole("link", { name: "F.A.Q.", exact: true }).click();
  await expect(page).toHaveURL(/\/Physics-Learning-Wiki\/intro\/faq\//);
  await expect(page.getByRole("heading", { name: "F.A.Q.", exact: true })).toBeVisible();
  expect(eagerFeatureRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});
