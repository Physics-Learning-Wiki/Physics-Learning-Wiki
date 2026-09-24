import { defineConfig, devices } from "@playwright/test";

const browserChannel = process.env.PLW_PLAYWRIGHT_CHANNEL;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    ...(browserChannel ? { channel: browserChannel as "chrome" | "msedge" } : {})
  },
  webServer: {
    command: "node scripts/test/serve-site.mjs --site site --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173/Physics-Learning-Wiki/",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
