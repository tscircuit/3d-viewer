import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./playwright",
  timeout: 90_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/renderer-comparison-results.json" }],
  ],
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
    baseURL: "http://127.0.0.1:5187/renderer-comparison/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
  },
  projects: [
    { name: "via-tenting", testMatch: "**/via-tenting.pw.ts" },
    { name: "calibration", testMatch: "**/*.calibration.pw.ts" },
    { name: "diagnostics", testMatch: "**/*.diagnostic.pw.ts" },
  ],
  webServer: {
    command: "bun run test:renderer-comparisons:serve",
    url: "http://127.0.0.1:5187/renderer-comparison/",
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
