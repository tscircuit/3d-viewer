import { defineConfig, devices } from "@playwright/test"
import { fileURLToPath } from "node:url"

export default defineConfig({
  testDir: ".",
  testMatch: "edge-controls.visual.pw.ts",
  timeout: 90_000,
  expect: { timeout: 30_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  workers: 1,
  retries: 0,
  use: {
    ...devices["Desktop Chrome"],
    channel: "chromium",
    viewport: { width: 1000, height: 760 },
    deviceScaleFactor: 1,
    baseURL: "http://127.0.0.1:5187/renderer-comparison/",
    launchOptions: {
      executablePath: process.env.EDGE_TEST_CHROMIUM_PATH,
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "bunx vite --config playwright/vite.config.ts",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:5187/renderer-comparison/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
