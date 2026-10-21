import { expect, test } from "@playwright/test"

test("plane drags without orbiting, remains active when closed, and clears", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto("section.html")
  await page.getByRole("button", { name: "Section", exact: true }).click()
  const offset = page.getByRole("spinbutton", { name: "Section offset (mm)" })
  await expect(offset).toHaveValue("0")
  await page.waitForFunction(() =>
    Boolean(window.__TSCIRCUIT_THREE_OBJECT?.userData.sectionView),
  )
  // Wait for the worker to finish and expose visible cap meshes in the scene.
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__TSCIRCUIT_THREE_OBJECT?.parent?.children.some(
          (o) =>
            o.type === "Group" &&
            o.children.some(
              (c) =>
                c.type === "Mesh" && (c as any).material.map?.isDataTexture,
            ),
        ),
      ),
    )
    .toBe(true)
  const before = await page.evaluate(() => {
    const root = window.__TSCIRCUIT_THREE_OBJECT!
    const helper = root.parent!.children.find(
      (o) => o.name === "Section plane helper",
    )!
    // The camera is accessible through the canvas test instrumentation below.
    const camera = (window as any).__sectionCamera
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      center: helper.position.clone().project(camera).toArray(),
    }
  })
  const size = page.viewportSize()!
  const x = ((before.center[0]! + 1) / 2) * size.width
  const y = ((1 - before.center[1]!) / 2) * size.height
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 120, y + 10, { steps: 12 })
  await page.mouse.up()
  await expect.poll(async () => Number(await offset.inputValue())).not.toBe(0)
  expect(
    await page.evaluate(() => ({
      position: (window as any).__sectionCamera.position.toArray(),
      quaternion: (window as any).__sectionCamera.quaternion.toArray(),
    })),
  ).toEqual({ position: before.position, quaternion: before.quaternion })
  await page.getByRole("button", { name: "Close section controls" }).click()
  await expect(
    page.getByRole("button", { name: "Section on · Edit" }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Clear", exact: true }).click()
  await expect(page.getByTestId("section-state")).toHaveText("null")
  await expect
    .poll(() =>
      page.evaluate(() => {
        const root = window.__TSCIRCUIT_THREE_OBJECT!
        let clipped = false
        root.traverse((o) => {
          if ((o as any).material?.clippingPlanes?.length) clipped = true
        })
        return clipped
      }),
    )
    .toBe(false)
  expect(errors).toEqual([])
})
for (const engine of ["jscad", "manifold"])
  test(`sections work in ${engine} viewer`, async ({ page }) => {
    await page.goto(`section.html?engine=${engine}`)
    await expect
      .poll(() =>
        page.evaluate(
          () => window.__TSCIRCUIT_THREE_OBJECT?.children.length ?? 0,
        ),
      )
      .toBeGreaterThan(0)
    await page.getByRole("button", { name: "Section", exact: true }).click()
    await page.getByRole("button", { name: "Z", exact: true }).click()
    await page.getByRole("spinbutton").fill("-0.3")
    await expect
      .poll(() =>
        page.evaluate(
          () => window.__TSCIRCUIT_THREE_OBJECT?.userData.sectionView?.offset,
        ),
      )
      .toBe(-0.3)
    await page.screenshot({ path: `test-results/section-${engine}.png` })
  })
