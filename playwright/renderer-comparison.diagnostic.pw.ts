import { expect, test } from "@playwright/test"
import { comparisonCases } from "../tests/fixtures/renderer-parity/cases"
import { compareCapture, openComparison } from "./comparison-helpers"

for (const fixture of comparisonCases.filter(
  (entry) => entry.id !== "calibration",
)) {
  for (const view of ["oblique", "side"] as const) {
    test(`${fixture.title} (${view})`, async ({ page }, testInfo) => {
      testInfo.annotations.push({
        type: "diagnostic",
        description:
          "Renderer mismatch is intentionally non-blocking in CI; neither renderer is modified.",
      })
      await openComparison(page, fixture.id)
      try {
        const result = await compareCapture(page, testInfo, view)
        expect(
          result.exportMessages,
          "Exporter reported a loading/rendering issue",
        ).toEqual([])
        expect(result.matches, JSON.stringify(result, null, 2)).toBe(true)
      } finally {
        await testInfo.attach("comparison-story", {
          body: await page
            .getByTestId("renderer-comparison-context")
            .screenshot(),
          contentType: "image/png",
        })
      }
    })
  }
}
