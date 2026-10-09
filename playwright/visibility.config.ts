import { defineConfig, devices } from "@playwright/test"
import { fileURLToPath } from "node:url"

export default defineConfig({
  testDir: ".",
  testMatch: "hidden-objects.interaction.pw.ts",
  timeout: 90_000,
  expect: { timeout: 30_000 },
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  outputDir: "../test-results/visibility",
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
    baseURL: "http://127.0.0.1:5187/renderer-comparison/",
    proxy: process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost" }
      : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
  },
  webServer: {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    command: "bunx vite --config playwright/vite.config.ts",
    url: "http://127.0.0.1:5187/renderer-comparison/",
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
