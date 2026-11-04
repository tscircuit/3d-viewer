import { expect, test, type Page } from "@playwright/test"

async function appearance(page: Page) {
  await page
    .getByTestId("edge-demo")
    .locator("canvas")
    .last()
    .click({ button: "right", position: { x: 150, y: 50 } })
  await page.getByRole("menuitem", { name: "Appearance", exact: true }).hover()
}

async function chooseMode(page: Page, mode: string) {
  await appearance(page)
  await page.getByRole("menuitem", { name: "Edges", exact: true }).hover()
  await page.getByRole("menuitemradio", { name: mode, exact: true }).click()
  await page
    .getByTestId("edge-demo")
    .locator("canvas")
    .last()
    .click({ position: { x: 750, y: 580 } })
  await page.mouse.move(900, 700)
}

async function overlayState(page: Page) {
  return page.evaluate(() => {
    const root = window.__TSCIRCUIT_THREE_OBJECT
    const overlay = root?.parent?.getObjectByName("cad-edge-overlay")
    const strokes: { type: string; visible: boolean; width: number }[] = []
    overlay?.traverse((object: any) => {
      if (!object.userData.edgeType) return
      let current: any = object
      let visible = true
      while (current) {
        visible &&= current.visible
        current = current.parent
      }
      strokes.push({
        type: object.userData.edgeType,
        visible,
        width: object.material.linewidth,
      })
    })
    return {
      strokes,
      exportedOverlay: !!root?.getObjectByName("cad-edge-overlay"),
    }
  })
}

for (const engine of ["manifold", "jscad", "glb"] as const) {
  test(`${engine} lamp shows visible and hidden edges with adjustable width`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.addInitScript((engine) => {
      localStorage.clear()
      localStorage.setItem("cadViewerEngine", engine)
      localStorage.setItem("cadViewerLightingEnabled", "false")
    }, engine)
    await page.goto(`?edges=${engine === "glb" ? "glb" : "lamp"}`)
    await page.waitForFunction(() => {
      let count = 0
      window.__TSCIRCUIT_THREE_OBJECT?.traverse((object: any) => {
        if (object.isMesh) count++
      })
      return count >= 4
    })
    expect((await overlayState(page)).strokes).toHaveLength(0)
    await chooseMode(page, "Visible")
    await expect
      .poll(
        async () =>
          (await overlayState(page)).strokes.filter((stroke) => stroke.visible)
            .length,
      )
      .toBeGreaterThan(0)
    expect(
      (await overlayState(page)).strokes
        .filter((stroke) => stroke.visible)
        .every((stroke) => stroke.type === "visible"),
    ).toBe(true)
    const visiblePixels = await page.getByTestId("edge-demo").screenshot()
    await chooseMode(page, "Visible and hidden")
    await expect
      .poll(async () =>
        (await overlayState(page)).strokes.some(
          (stroke) => stroke.visible && stroke.type === "hidden",
        ),
      )
      .toBe(true)
    expect(await page.getByTestId("edge-demo").screenshot()).not.toEqual(
      visiblePixels,
    )
    await expect(page.getByTestId("edge-demo")).toHaveScreenshot(
      `${engine}-lamp-hidden.png`,
    )
    await appearance(page)
    await page.getByRole("menuitem", { name: /^Edge width/ }).hover()
    await page.getByRole("menuitemradio", { name: "4 px", exact: true }).click()
    await page
      .getByTestId("edge-demo")
      .locator("canvas")
      .last()
      .click({ position: { x: 750, y: 580 } })
    await page.mouse.move(900, 700)
    await expect
      .poll(async () =>
        (await overlayState(page)).strokes.every(
          (stroke) => stroke.width === 4,
        ),
      )
      .toBe(true)
    expect((await overlayState(page)).exportedOverlay).toBe(false)
    await chooseMode(page, "Off")
    await expect
      .poll(async () => (await overlayState(page)).strokes.length)
      .toBe(0)
    expect(errors).toEqual([])
  })
}
