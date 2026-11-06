import { defineConfig } from "@playwright/test"
import config from "./playwright.config"
export default defineConfig({
  ...config,
  projects: [{ name: "explosion", testMatch: "**/explosion.pw.ts" }],
  webServer: {
    command: "bunx vite --config playwright/vite.config.ts",
    url: "http://127.0.0.1:5187/renderer-comparison/explosion.html",
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
