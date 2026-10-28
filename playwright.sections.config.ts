import { defineConfig } from "@playwright/test"
import config from "./playwright.config"

export default defineConfig({
  ...config,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  use: { ...config.use, actionTimeout: 15_000 },
  projects: [{ name: "sections", testMatch: "**/section.pw.ts" }],
  webServer: {
    command: "bunx vite --config playwright/vite.config.ts",
    url: "http://127.0.0.1:5187/renderer-comparison/section.html",
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
