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
  await expect(slider).toHaveAttribute("max", "4")
  await slider.fill("0.5")
  await expect
    .poll(async () => (await positions()).cad_component_112?.[2])
    .toBe(12)
  await expect
    .poll(async () => (await positions()).cad_component_113?.[2])
    .toBe(12)
  await slider.fill("1")
  await expect
    .poll(async () => (await positions()).cad_component_112?.[2])
    .toBe(24)
  await expect
    .poll(async () => (await positions()).cad_component_113?.[2])
    .toBe(24)
  await slider.fill("1.5")
  await expect
    .poll(async () => (await positions()).cad_component_113?.[2])
    .toBe(44.5)
  await expect
    .poll(async () => (await positions()).cad_component_112?.[2])
    .toBe(24)
  await slider.fill("4")
  await expect
    .poll(async () => (await positions()).cad_component_113?.[2])
    .toBe(65)
  await expect
    .poll(async () => (await positions()).cad_component_113?.[0])
    .toBe(original.cad_component_113![0])
  expect(
    await page.evaluate(() => (window as any).__originalCanvas.isConnected),
  ).toBe(true)
  await page.getByRole("button", { name: "Reset", exact: true }).click()
  await expect.poll(positions).toEqual(original)
  await slider.fill("4")
  await page.getByRole("button", { name: "Close exploded view" }).click()
  await expect(slider).toHaveCount(0)
  await expect.poll(positions).toEqual(original)
  expect(errors).toEqual([])
})

test("playback timing, pause, seek, replay and close", async ({ page }) => {
  await page.goto("explosion.html")
  await page
    .locator("canvas")
    .last()
    .click({ button: "right", position: { x: 400, y: 350 } })
  await page.getByRole("menuitem", { name: "Advanced", exact: true }).hover()
  await page
    .getByRole("menuitem", { name: "Exploded view…", exact: true })
    .click()
  const slider = page.getByRole("slider", { name: "Assembly explosion" })
  const duration = page.getByRole("spinbutton", { name: "Seconds per stage" })
  await expect(duration).toHaveValue("2")
  await page.clock.install()
  await page.getByRole("button", { name: "Play", exact: true }).click()
  await page.clock.runFor(1000)
  expect(Number(await slider.inputValue())).toBeCloseTo(0.5, 1)
  await page.getByRole("button", { name: "Pause", exact: true }).click()
  const paused = await slider.inputValue()
  await page.clock.runFor(2000)
  await expect(slider).toHaveValue(paused)
  await page.getByRole("button", { name: "Next explosion stage" }).click()
  await expect(slider).toHaveValue("1")
  await page.getByRole("button", { name: "Previous explosion stage" }).click()
  await expect(slider).toHaveValue("0")
  await duration.fill("0.5")
  await page.getByRole("button", { name: "Play", exact: true }).click()
  await page.clock.runFor(1600)
  await expect(slider).toHaveValue("3")
  await page.getByRole("button", { name: "Replay", exact: true }).click()
  await page.clock.runFor(250)
  expect(Number(await slider.inputValue())).toBeCloseTo(0.5, 1)
  await slider.fill("1.5")
  await page.clock.runFor(1000)
  await expect(slider).toHaveValue("1.5")
  await page.getByRole("button", { name: "Play", exact: true }).click()
  await page.getByRole("button", { name: "Reset", exact: true }).click()
  await page.clock.runFor(1000)
  await expect(slider).toHaveValue("0")
  await page.getByRole("button", { name: "Play", exact: true }).click()
  await page.getByRole("button", { name: "Close exploded view" }).click()
  await page.clock.runFor(1000)
  await expect(slider).toHaveCount(0)
})

test("FLEX17 sample exposes its authored explosion stages", async ({
  page,
}) => {
  await page.goto("flex17-explosion.html")
  await page
    .locator("canvas")
    .last()
    .click({ button: "right", position: { x: 400, y: 350 } })
  await page.getByRole("menuitem", { name: "Advanced", exact: true }).hover()
  await page
    .getByRole("menuitem", { name: "Exploded view…", exact: true })
    .click()
  const slider = page.getByRole("slider", { name: "Assembly explosion" })
  expect(Number(await slider.getAttribute("max"))).toBeGreaterThan(10)
  await page.getByRole("button", { name: "Next explosion stage" }).click()
  await expect(slider).toHaveValue("1")
  await expect(slider).toHaveAttribute("aria-valuetext", /remove_lid_screws/)
  // FLEX17 parts have baked geometry offsets and share a CAD origin. The
  // final guide endpoint must follow an actual moving model, not that origin.
  for (const amount of [1, 1.5, 6, 18]) {
    await slider.fill(String(amount))
    await expect
      .poll(() =>
        page.evaluate(() => {
          const root = window.__TSCIRCUIT_THREE_OBJECT
          if (!root) return Infinity
          let guides: any
          root.traverse((object) => {
            if (object.userData.assemblyExplosionGuides) guides = object
          })
          const attribute = guides?.geometry.getAttribute("position")
          const count = guides?.geometry.drawRange.count
          if (!guides?.visible || !attribute || !Number.isFinite(count))
            return Infinity
          const endpoint = root.position
            .clone()
            .fromBufferAttribute(attribute, count - 1)
          const inverse = root.matrixWorld.clone().invert()
          let nearest = Infinity
          root.traverse((group) => {
            if (
              !group.userData.cad_component_id ||
              group.position.length() === 0
            )
              return
            let bounds: any
            group.traverse((object: any) => {
              if (!object.isMesh || !object.geometry.boundingBox) return
              const box = object.geometry.boundingBox
                .clone()
                .applyMatrix4(inverse.clone().multiply(object.matrixWorld))
              if (!bounds) bounds = box
              else bounds.union(box)
            })
            if (bounds && !bounds.isEmpty())
              nearest = Math.min(
                nearest,
                endpoint.distanceTo(bounds.getCenter(root.position.clone())),
              )
          })
          return nearest
        }),
      )
      .toBeLessThan(0.001)
  }
  await expect(page.getByRole("alert")).toHaveCount(0)
})
