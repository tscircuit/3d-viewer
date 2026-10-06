import { defineConfig, devices } from "@playwright/test"

const externalServer = process.env.STORYBOOK_SMOKE_BASE_URL
const baseURL = externalServer ?? "http://127.0.0.1:6007"

export default defineConfig({
  testDir: "./playwright",
  testMatch: "**/*.storybook.pw.ts",
  timeout: 90_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  outputDir: "test-results/storybook",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
  },
  projects: [{ name: "storybook-smoke" }],
  webServer: externalServer
    ? undefined
    : {
        command:
          "bun run build-storybook && bun run vite preview --outDir storybook-static --host 127.0.0.1 --port 6007 --strictPort",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 180_000,
      },
})
