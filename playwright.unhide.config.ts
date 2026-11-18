import { defineConfig } from "@playwright/test"
import config from "./playwright.sections.config"

export default defineConfig({
  ...config,
  timeout: 90_000,
  projects: [
    { name: "unhide-components", testMatch: "**/unhide-components.pw.ts" },
  ],
})
