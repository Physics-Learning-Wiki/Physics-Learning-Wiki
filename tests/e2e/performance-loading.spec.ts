import { expect, test } from "@playwright/test";

const basePath = "/Physics-Learning-Wiki/";

const forbiddenOrdinaryPageRequests = [
  /(?:^|\/)features\/concept-reference\.(?:js|css)/i,
  /mathjax\.css/i,
  /(?:^|\/)features\/mermaid\.js/i,
  /(?:^|\/)features\/quiz\.js/i,
  /(?:^|\/)css\/quiz\.css/i,
  /(?:^|\/)features\/submit\.(?:js|css)/i,
  /(?:^|\/)features\/question-contribute\.(?:js|css)/i,
  /easymde/i,
  /(?:^|\/)pagefind(?:\/|\.|-)/i,
  /(?:^|\/)\_generated\/question-bank\//i
];

test("ordinary pages do not request page-specific features", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));

  await page.goto(`${basePath}intro/about/`);
  await expect(page.locator("article.md-content__inner.md-typeset")).toBeVisible();
  await page.waitForTimeout(300);

  const eagerFeatureRequests = requests.filter(url =>
    forbiddenOrdinaryPageRequests.some(pattern => pattern.test(new URL(url).pathname))
  );
  expect(eagerFeatureRequests).toEqual([]);
});
