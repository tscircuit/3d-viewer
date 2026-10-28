import { expect, test } from "@playwright/test"

for (const engine of ["manifold", "jscad"]) {
  test(`${engine}: TSX stage scrub changes the scene and reset restores it`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(`explosion.html?engine=${engine}`)
    const slider = page.getByRole("slider", { name: "Assembly explosion" })
    await expect(slider).toBeVisible()
    await expect
      .poll(() =>
        page
          .locator("canvas")
          .evaluateAll((elements) =>
            elements.some((e) => (e as HTMLCanvasElement).width >= 900),
          ),
      )
      .toBe(true)
    const canvasIndex = await page
      .locator("canvas")
      .evaluateAll((elements) =>
        elements.findIndex((e) => (e as HTMLCanvasElement).width >= 900),
      )
    const canvas = page.locator("canvas").nth(canvasIndex)
    await expect(canvas).toBeVisible()
    // Let asynchronous model loading and the first camera frame finish.
    await page.waitForTimeout(1500)
    const positions = () =>
      page.evaluate(() => {
        const groups: number[][] = []
        window.__TSCIRCUIT_THREE_OBJECT?.traverse((object) => {
          if (object.userData.cad_component_id)
            groups.push(object.position.toArray())
        })
        return groups
      })
    await expect.poll(async () => (await positions()).length).toBe(3)
    const originalPositions = await positions()
    const assembled = await canvas.screenshot()
    await slider.fill("2.5")
    await expect(slider).toHaveAttribute("aria-valuetext", "case.remove-cap")
    await page.waitForTimeout(150)
    await expect.poll(positions).toEqual(
      expect.arrayContaining([
        [0, 0, 0],
        [20, 0, 15],
        [20, 0, 20],
      ]),
    )
    const exploded = await canvas.screenshot()
    expect(exploded.equals(assembled)).toBe(false)
    await testInfo.attach(`${engine}-exploded`, {
      body: exploded,
      contentType: "image/png",
    })
    await page.getByRole("button", { name: "Reset", exact: true }).click()
    await expect(slider).toHaveValue("0")
    await page.waitForTimeout(150)
    await expect.poll(positions).toEqual(originalPositions)
    expect((await canvas.screenshot()).equals(assembled)).toBe(true)
    expect(errors).toEqual([])
  })
}
