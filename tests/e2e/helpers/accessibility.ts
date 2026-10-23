import { expect, type Locator } from "@playwright/test";

export async function expectReadableContrast(locator: Locator): Promise<void> {
  await expect
    .poll(() =>
      locator.evaluate(element => {
        const rgb = (value: string) =>
          value
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number);
        const luminance = (channels: number[]) =>
          channels
            .map(channel => channel / 255)
            .map(channel => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
            .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
        let background = element;
        while (getComputedStyle(background).backgroundColor === "rgba(0, 0, 0, 0)" && background.parentElement)
          background = background.parentElement;
        const foreground = luminance(rgb(getComputedStyle(element).color));
        const backdrop = luminance(rgb(getComputedStyle(background).backgroundColor));
        return (Math.max(foreground, backdrop) + 0.05) / (Math.min(foreground, backdrop) + 0.05);
      })
    )
    .toBeGreaterThanOrEqual(4.5);
}
