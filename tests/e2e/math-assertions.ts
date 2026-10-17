import { expect, type Locator } from "@playwright/test";

export async function expectAssistiveMathClipped(root: Locator): Promise<void> {
  const containers = root.locator("mjx-container");
  const assistive = root.locator("mjx-assistive-mml");
  await expect(containers.filter({ visible: true }).first()).toBeVisible();
  await expect(assistive).toHaveCount(await containers.count());
  await expect
    .poll(() =>
      assistive.evaluateAll(elements =>
        elements.every(element => {
          const style = getComputedStyle(element);
          return (
            style.position === "absolute" &&
            style.clip === "rect(1px, 1px, 1px, 1px)" &&
            style.overflow === "hidden" &&
            style.display !== "none"
          );
        })
      )
    )
    .toBe(true);
}
