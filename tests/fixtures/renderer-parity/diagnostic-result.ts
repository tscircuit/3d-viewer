import { z } from "zod"

const count = z.number().int().nonnegative()
const reportSchema = z.object({
  errors: z.array(z.unknown()),
  stats: z.object({
    expected: count,
    unexpected: count,
    flaky: count,
    skipped: count,
  }),
})

/** A completed failing diagnostic run is useful output, not a gating failure. */
export function summarizeDiagnosticRun(report: unknown, exitCode: number) {
  if (exitCode !== 0 && exitCode !== 1)
    throw new Error(`Playwright did not complete normally (exit ${exitCode})`)
  const { errors, stats } = reportSchema.parse(report)
  if (errors.length)
    throw new Error(
      `Playwright reported runner errors: ${JSON.stringify(errors)}`,
    )
  if (stats.expected + stats.unexpected + stats.flaky === 0)
    throw new Error("No diagnostic tests executed")
  if ((exitCode === 0) !== (stats.unexpected === 0))
    throw new Error("Playwright exit code and diagnostic report disagree")
  return {
    passed: stats.expected,
    failed: stats.unexpected,
    flaky: stats.flaky,
    skipped: stats.skipped,
  }
}
