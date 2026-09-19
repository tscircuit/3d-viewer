import { rm } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { summarizeDiagnosticRun } from "../tests/fixtures/renderer-parity/diagnostic-result"

const root = fileURLToPath(new URL("..", import.meta.url))
const reportPath = `${root}/test-results/renderer-comparison-results.json`
// Never mistake a previous successful report for a failed launch.
await rm(reportPath, { force: true })
const child = Bun.spawn(
  [
    "bunx",
    "--no-install",
    "playwright",
    "test",
    "--project=diagnostics",
    ...process.argv.slice(2),
  ],
  { cwd: root, stdin: "inherit", stdout: "inherit", stderr: "inherit" },
)
const exitCode = await child.exited
const report = Bun.file(reportPath)
if (!(await report.exists()))
  throw new Error(`Playwright produced no diagnostic report (exit ${exitCode})`)
const summary = summarizeDiagnosticRun(await report.json(), exitCode)
console.log(
  `Renderer diagnostics: ${summary.passed} passed, ${summary.failed} failed, ` +
    `${summary.flaky} flaky, ${summary.skipped} skipped. ` +
    "Completed comparison failures are intentionally non-blocking; " +
    "the failures and image artifacts remain in playwright-report/.",
)
