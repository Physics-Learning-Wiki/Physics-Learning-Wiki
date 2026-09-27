import { expect, test } from "@playwright/test";

const basePath = "/Physics-Learning-Wiki/";

test("saving a question, organizing it, and restoring a backup", async ({ page }) => {
  await page.goto(`${basePath}quiz/questions/`);
  const first = page.locator(".plw-quiz-question-browser__card").first();
  await expect(first).toBeVisible();
  const id = await first.getAttribute("data-question-id");
  await first.getByRole("button", { name: "☆ 收藏" }).click();
  await expect(first.getByRole("button", { name: "★ 已收藏" })).toBeVisible();

  await page.goto(`${basePath}quiz/library/?view=saved`);
  const card = page.locator(".plw-quiz-library__card").filter({ has: page.getByRole("heading", { name: id! }) });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "整理收藏夹" }).click();
  const picker = page.getByRole("dialog", { name: `整理 ${id}` });
  await expect(picker).toBeVisible();
  await picker.getByRole("textbox", { name: "新建收藏夹（可选）" }).fill("期末复习");
  await picker.getByRole("button", { name: "取消" }).click();
  await expect(page.getByRole("combobox", { name: "选择收藏夹" }).locator("option")).toHaveCount(2);
  await card.getByRole("button", { name: "整理收藏夹" }).click();
  await picker.getByRole("textbox", { name: "新建收藏夹（可选）" }).fill("期末复习");
  await picker.getByRole("button", { name: "保存整理" }).click();
  await expect(page.getByRole("combobox", { name: "选择收藏夹" }).locator("option")).toHaveCount(3);

  await page.getByRole("link", { name: "学习数据" }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出学习档案" }).click();
  const download = await downloadEvent;
  const stream = await download.createReadStream();
  let raw = "";
  for await (const chunk of stream!) raw += chunk.toString("utf8");
  const backup = JSON.parse(raw);
  expect(backup.data.library.savedQuestions[id!]).toBeDefined();
  expect(Object.values(backup.data.library.collections)).toHaveLength(1);

  await page.goto(`${basePath}quiz/questions/`);
  const second = page.locator(".plw-quiz-question-browser__card").nth(1);
  const secondId = await second.getAttribute("data-question-id");
  await second.getByRole("button", { name: "☆ 收藏" }).click();
  await page.goto(`${basePath}quiz/library/?view=data`);
  await page.locator('input[type="file"]').setInputFiles({
    name: "backup.json", mimeType: "application/json", buffer: Buffer.from(raw, "utf8")
  });
  await expect(page.getByRole("button", { name: "覆盖并恢复" })).toBeVisible();
  await page.getByRole("button", { name: "覆盖并恢复" }).click();
  await page.getByRole("link", { name: /收藏/ }).click();
  await expect(page.getByRole("heading", { name: id! })).toBeVisible();
  await expect(page.getByRole("heading", { name: secondId! })).toHaveCount(0);
});

test("local practice resumes after refresh with the same question", async ({ page }) => {
  await page.goto(`${basePath}quiz/questions/`);
  const first = page.locator(".plw-quiz-question-browser__card").first();
  await expect(first).toBeVisible();
  await first.getByRole("button", { name: "☆ 收藏" }).click();
  await page.goto(`${basePath}quiz/library/?view=saved`);
  await page.getByRole("button", { name: "练习此题" }).click();
  await expect(page).toHaveURL(/\/quiz\/play\/\?session=[0-9a-f-]+$/);
  const question = page.locator(".plw-quiz-question");
  await expect(question).toBeVisible();
  const id = await question.getAttribute("data-question-id");
  await page.reload();
  await expect(page.locator(".plw-quiz-question")).toHaveAttribute("data-question-id", id!);
});

test("objective errors enter the wrong book and mastery reopens after another error", async ({ page }) => {
  await page.goto(`${basePath}quiz/questions/`);
  const manifestResponse = await page.request.get(`${basePath}_generated/question-bank/manifest.json`);
  const manifest = await manifestResponse.json();
  const catalogResponse = await page.request.get(
    new URL(manifest.catalogs.questions, new URL(`${basePath}_generated/question-bank/manifest.json`, page.url())).href
  );
  const catalog = await catalogResponse.json() as Array<{
    id: string; type: string; status: string; choices?: Array<{ id: string }>; answer?: { choice: string }
  }>;
  const q = catalog.find(item => item.status === "published" && item.type === "single_choice" &&
    item.choices?.some(choice => choice.id !== item.answer?.choice));
  expect(q).toBeDefined();
  const wrongChoice = q!.choices!.find(choice => choice.id !== q!.answer!.choice)!.id;
  await page.goto(`${basePath}quiz/questions/?q=${q!.id}`);
  const card = page.locator(`#q-${q!.id}`);
  await expect(card).toBeVisible();
  await card.locator(`.plw-quiz-choice:has(input[value="${wrongChoice}"])`).click();
  await card.getByRole("button", { name: "试答并检验" }).click();
  await expect(page.locator(`#q-${q!.id} .plw-quiz-feedback`)).toBeVisible();
  await page.goto(`${basePath}quiz/library/?view=mistakes`);
  await expect(page.getByRole("heading", { name: q!.id })).toBeVisible();
  await page.getByRole("button", { name: "标记已掌握" }).click();
  await page.goto(`${basePath}quiz/library/?view=mistakes&state=mastered`);
  await expect(page.getByRole("heading", { name: q!.id })).toBeVisible();
  await page.goto(`${basePath}quiz/questions/?q=${q!.id}`);
  await page.locator(`#q-${q!.id} .plw-quiz-choice:has(input[value="${wrongChoice}"])`).click();
  await page.locator(`#q-${q!.id}`).getByRole("button", { name: "试答并检验" }).click();
  await expect(page.locator(`#q-${q!.id} .plw-quiz-feedback`)).toBeVisible();
  await page.goto(`${basePath}quiz/library/?view=mistakes&state=learning`);
  await expect(page.getByRole("heading", { name: q!.id })).toBeVisible();
});

test("copy tools use learner markdown and a fixed DeepSeek destination", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`${basePath}quiz/questions/`);
  const card = page.locator(".plw-quiz-question-browser__card").first();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "复制题目" }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("题目 ID：");
  expect(copied).not.toContain("官方解析");
  await card.getByRole("button", { name: "复制 AI 提问" }).click();
  const prompt = await page.evaluate(() => navigator.clipboard.readText());
  expect(prompt).toContain("我正在学习物理");
  expect(prompt).toContain(copied);
  const deepseek = card.getByRole("link", { name: "打开 DeepSeek ↗" });
  await expect(deepseek).toHaveAttribute("href", "https://chat.deepseek.com/");
  await expect(deepseek).toHaveAttribute("target", "_blank");
  await expect(deepseek).toHaveAttribute("rel", "noopener noreferrer");
});
