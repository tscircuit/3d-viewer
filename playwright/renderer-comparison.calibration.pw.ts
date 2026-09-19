import { expect, test } from "@playwright/test"
import { compareCapture, openComparison } from "./comparison-helpers"

test("geometry comparison accepts identical rendering and rejects deliberate placement defects", async ({
  page,
}, testInfo) => {
  const exporterRequests: string[] = []
  await page.route("**/renderer-comparison/generated/*.glb", async (route) => {
    exporterRequests.push(route.request().url())
    await route.abort("failed")
  })
  await openComparison(page, "calibration")
  for (const view of ["oblique", "side"] as const) {
    const same = await compareCapture(page, testInfo, view, "none")
    expect(
      same.matches,
      `Identical geometry did not match: ${JSON.stringify(same)}`,
    ).toBe(true)
    for (const mutation of [
      "origin-shift",
      "reverse-x",
      "wrong-order",
    ] as const) {
      const different = await compareCapture(page, testInfo, view, mutation)
      expect(
        different.matches,
        `${view}/${mutation} was incorrectly accepted: ${JSON.stringify(different)}`,
      ).toBe(false)
    }
  }
  expect(
    exporterRequests,
    "Viewer-only calibration must not load exported geometry",
  ).toEqual([])
})
