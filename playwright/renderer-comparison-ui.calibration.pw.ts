import { expect, test } from "@playwright/test"
import type { ComparisonManifest } from "../tests/fixtures/renderer-parity/types"
import { openComparison } from "./comparison-helpers"

test("stories automatically display both below-board pixel comparisons without an exporter", async ({
  page,
}) => {
  // Exercise camera/UI controls through viewer-only calibration, so a renderer
  // mismatch cannot become a blocking UI-test failure.
  await page.route(
    "**/renderer-comparison/generated/manifest.json",
    async (route) => {
      const response = await route.fetch()
      const manifest: ComparisonManifest = await response.json()
      const fixture = manifest.cases.find((entry) => entry.id === "calibration")
      if (!fixture) throw new Error("Missing camera calibration fixture")
      fixture.camera.fromBelow = true
      await route.fulfill({ response, json: manifest })
    },
  )
  const exporterRequests: string[] = []
  await page.route("**/renderer-comparison/generated/*.glb", async (route) => {
    exporterRequests.push(route.request().url())
    await route.abort("failed")
  })
  await openComparison(page, "calibration")
  await expect(page.getByTestId("geometry-comparison")).toHaveCount(2)
  await expect(
    page.getByRole("button", { name: /^Compare .* geometry$/ }),
  ).toHaveCount(0)
  for (const view of ["side", "oblique"] as const) {
    const comparison = page.locator(
      `[data-testid="geometry-comparison"][data-view="${view}"]`,
    )
    await expect(comparison).toHaveAttribute("data-state", "ready")
    await expect(comparison).toHaveAttribute("data-view", view)
    await expect(comparison).toHaveAttribute("data-from-below", "true")
    await expect(comparison).toHaveAttribute("data-mutation", "none")
    await expect(comparison).toHaveAttribute("data-matches", "true")
    await expect(comparison.getByRole("img")).toHaveCount(5)
    await expect(
      comparison.getByAltText("Fuzzy edge comparison overlay"),
    ).toBeVisible()
  }
  // Showing or recapturing one view must not hide the other.
  await page.evaluate(async () => {
    await window.rendererComparison!.captureGeometry("oblique", "none")
  })
  await expect(
    page.locator('[data-testid="geometry-comparison"][data-view="side"]'),
  ).toHaveAttribute("data-state", "ready")
  expect(exporterRequests).toEqual([])
})
