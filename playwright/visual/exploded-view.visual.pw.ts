import { expect, test } from "@playwright/test"

test("renders an authored exploded assembly", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=assembly-exploded-view--visual-snapshot-fixture&viewMode=story",
  )

  const slider = page.getByRole("slider", { name: "Explode assembly" })
  await expect(slider).toBeVisible()
  await expect(page.locator("canvas").last()).toBeVisible()
  await slider.fill("100")
  await expect(slider).toHaveAttribute("aria-valuetext", "100% exploded")

  await expect(page).toHaveScreenshot("authored-exploded-assembly.png", {
    animations: "disabled",
    mask: [page.getByTestId("viewer-version")],
    maskColor: "#ffffff",
  })
})
