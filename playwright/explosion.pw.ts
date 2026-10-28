import { expect, test } from "@playwright/test"

for (const engine of ["manifold", "jscad"]) {
  test(`${engine}: TSX stage scrub changes the scene and reset restores it`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(`explosion.html?engine=${engine}`)
    await page
      .locator("canvas")
      .last()
      .click({ button: "right", position: { x: 400, y: 350 } })
    await page.getByRole("menuitem", { name: "Advanced", exact: true }).hover()
    await page
      .getByRole("menuitem", { name: "Exploded view…", exact: true })
      .click()
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

test("real RP2040 uses Advanced menu, continuous scrubbing and reset without replacing the canvas", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto("rp2040-explosion.html")
  await expect(page.getByRole("combobox")).toHaveCount(0)
  await expect(
    page.getByRole("slider", { name: "Assembly explosion" }),
  ).toHaveCount(0)
  const positions = () =>
    page.evaluate(() => {
      const result: Record<string, number[]> = {}
      window.__TSCIRCUIT_THREE_OBJECT?.traverse((o) => {
        if (o.userData.cad_component_id)
          result[o.userData.cad_component_id] = o.position.toArray()
      })
      return result
    })
  await expect.poll(async () => Object.keys(await positions()).length).toBe(117)
  await page.evaluate(() => {
    ;(window as any).__originalCanvas = [
      ...document.querySelectorAll("canvas"),
    ].find((c) => c.width > 500)
  })
  const original = await positions()
  await page
    .locator("canvas")
    .last()
    .click({ button: "right", position: { x: 300, y: 350 } })
  await page.getByRole("menuitem", { name: "Advanced", exact: true }).hover()
  await page
    .getByRole("menuitem", { name: "Exploded view…", exact: true })
    .click()
  const slider = page.getByRole("slider", { name: "Assembly explosion" })
  await expect(slider).toHaveAttribute("max", "5")
  await slider.fill("1.5")
  await expect
    .poll(async () => (await positions()).cad_component_112?.[2])
    .toBe(12)
  await slider.fill("5")
  await expect
    .poll(async () => (await positions()).cad_component_112?.[2])
    .toBe(24)
  await expect
    .poll(async () => (await positions()).cad_component_113?.[0])
    .toBe(24)
  await slider.fill("4.5")
  await expect
    .poll(async () => (await positions()).cad_component_113?.[0])
    .toBe(12)
  await expect
    .poll(async () => (await positions()).cad_component_113?.[2])
    .toBe(65)
  expect(
    await page.evaluate(() => (window as any).__originalCanvas.isConnected),
  ).toBe(true)
  await page.getByRole("button", { name: "Reset", exact: true }).click()
  await expect.poll(positions).toEqual(original)
  await slider.fill("5")
  await page.getByRole("button", { name: "Close exploded view" }).click()
  await expect(slider).toHaveCount(0)
  await expect.poll(positions).toEqual(original)
  expect(errors).toEqual([])
})
