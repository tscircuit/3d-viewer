import { expect, test } from "bun:test"
import { summarizeDiagnosticRun } from "./fixtures/renderer-parity/diagnostic-result"

test.each([
  { name: "matching comparisons", exit: 0, passed: 4, failed: 0, error: false },
  {
    name: "documented differences",
    exit: 1,
    passed: 4,
    failed: 20,
    error: false,
  },
  {
    name: "all comparisons differ",
    exit: 1,
    passed: 0,
    failed: 24,
    error: false,
  },
  { name: "no tests ran", exit: 0, passed: 0, failed: 0, error: true },
  {
    name: "success contradicts report",
    exit: 0,
    passed: 0,
    failed: 1,
    error: true,
  },
  {
    name: "failure has no test failures",
    exit: 1,
    passed: 1,
    failed: 0,
    error: true,
  },
  { name: "interrupted runner", exit: 130, passed: 1, failed: 1, error: true },
  {
    name: "runner setup error",
    exit: 1,
    passed: 0,
    failed: 1,
    error: true,
    errors: [{ message: "server failed" }],
  },
  { name: "malformed report", exit: 0, passed: -1, failed: 0, error: true },
])("$name is classified without hiding runner failures", (entry) => {
  const report = {
    errors: entry.errors ?? [],
    stats: {
      expected: entry.passed,
      unexpected: entry.failed,
      flaky: 0,
      skipped: 0,
    },
  }
  if (entry.error) {
    expect(() => summarizeDiagnosticRun(report, entry.exit)).toThrow()
  } else {
    expect(summarizeDiagnosticRun(report, entry.exit)).toEqual({
      passed: entry.passed,
      failed: entry.failed,
      flaky: 0,
      skipped: 0,
    })
  }
})
