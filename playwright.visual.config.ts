import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./playwright/visual",
  testMatch: "**/*.visual.pw.ts",
  snapshotPathTemplate: "{testDir}/__snapshots__/{arg}{ext}",
  timeout: 90_000,
  expect: {
    timeout: 30_000,
    toHaveScreenshot: {
      threshold: 0.25,
      maxDiffPixelRatio: 0.01,
    },
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 900, height: 700 },
    deviceScaleFactor: 1,
    baseURL: "http://127.0.0.1:6006/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
  },
  webServer: {
    command: "bunx storybook dev -p 6006 --ci --no-open",
    url: "http://127.0.0.1:6006/",
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
