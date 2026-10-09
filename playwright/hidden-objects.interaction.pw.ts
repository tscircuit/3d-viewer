import { expect, test, type Locator, type Page } from "@playwright/test"

const mainCanvas = async (viewer: Locator) => {
  // The orientation cube has its own canvas; target the actual scene viewport.
  let largest: Locator | undefined
  await expect(async () => {
    const canvases = await viewer.locator("canvas").all()
    let area = 0
    for (const canvas of canvases) {
      const bounds = await canvas.boundingBox()
      if (bounds && bounds.width * bounds.height > area) {
        largest = canvas
        area = bounds.width * bounds.height
      }
    }
    // Engine switches briefly unmount both canvases before the new scene exists.
    expect(area).toBeGreaterThan(100_000)
  }).toPass({ timeout: 30_000 })
  if (!largest) throw new Error("No rendered scene canvas")
  return largest
}

const closeMenu = async (page: Page, canvas: Locator) => {
  const bounds = await canvas.boundingBox()
  if (!bounds) throw new Error("Viewer canvas has no bounds")
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + 20)
  await expect(page.getByRole("menu")).toHaveCount(0)
}

const objectPoint = async ({
  canvas,
  xMm,
}: {
  canvas: Locator
  xMm: number
}) => {
  const bounds = await canvas.boundingBox()
  if (!bounds) throw new Error("Viewer canvas has no bounds")
  // The story uses a top-facing perspective camera at Z50, FOV75, with model
  // centres at Z3. Project the centre instead of guessing a screen coordinate.
  return {
    x:
      bounds.x +
      bounds.width / 2 +
      (xMm * bounds.height) / (2 * 47 * Math.tan((75 * Math.PI) / 360)),
    y: bounds.y + bounds.height / 2,
  }
}

const openBackgroundMenu = async ({
  page,
  canvas,
}: {
  page: Page
  canvas: Locator
}) => {
  const bounds = await canvas.boundingBox()
  if (!bounds) throw new Error("Viewer canvas has no bounds")
  await page.mouse.click(bounds.x + bounds.width - 20, bounds.y + 20, {
    button: "right",
  })
}

for (const engine of ["manifold", "jscad"] as const) {
  test(`${engine}: restore one hidden mechanical object through the keyboard submenu`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.addInitScript((selectedEngine) => {
      localStorage.setItem("cadViewerEngine", selectedEngine)
      localStorage.setItem("cadViewerCameraType", "perspective")
      localStorage.setItem("cadViewerAutoRotate", "false")
    }, engine)
    await page.goto("?viewer=hidden-objects")
    const viewer = page.getByTestId("visibility-viewer")
    await expect(viewer).toHaveAttribute("data-ready", "true")
    let canvas = await mainCanvas(viewer)
    const batteryPoint = await objectPoint({ canvas, xMm: 0 })
    await expect(async () => {
      await page.mouse.click(batteryPoint.x, batteryPoint.y, {
        button: "right",
      })
      await expect(
        page.getByRole("menuitem", { name: 'Hide "Battery"', exact: true }),
      ).toBeVisible()
      await closeMenu(page, canvas)
    }).toPass()
    const clip = {
      x: batteryPoint.x - 8,
      y: batteryPoint.y - 8,
      width: 16,
      height: 16,
    }
    const before = await page.screenshot({ clip })
    await page.mouse.click(batteryPoint.x, batteryPoint.y, { button: "right" })
    await page
      .getByRole("menuitem", { name: 'Hide "Battery"', exact: true })
      .click()
    await expect(page.getByRole("menu")).toHaveCount(0)
    await expect
      .poll(async () => (await page.screenshot({ clip })).equals(before))
      .toBe(false)
    const lidPoint = await objectPoint({ canvas, xMm: -12 })
    await page.mouse.click(lidPoint.x, lidPoint.y, { button: "right" })
    await page
      .getByRole("menuitem", { name: 'Hide "Lid"', exact: true })
      .click()
    await openBackgroundMenu({ page, canvas })
    await expect(page.getByRole("menuitem", { name: /^Hide "/ })).toHaveCount(0)
    const hiddenObjects = page.getByRole("menuitem", {
      name: "Show hidden objects (2)",
      exact: true,
    })
    await hiddenObjects.focus()
    await hiddenObjects.press("ArrowRight")
    await expect(
      page.getByRole("menuitem", { name: 'Show "Lid"', exact: true }),
    ).toBeVisible()
    const showBattery = page.getByRole("menuitem", {
      name: 'Show "Battery"',
      exact: true,
    })
    await expect(showBattery).toBeVisible()
    await page.screenshot({
      path: testInfo.outputPath("hidden-objects-menu.png"),
    })
    await showBattery.focus()
    await showBattery.press("Enter")
    await expect(page.getByRole("menu")).toHaveCount(0)
    await expect
      .poll(async () => (await page.screenshot({ clip })).equals(before))
      .toBe(true)
    await openBackgroundMenu({ page, canvas })
    const remaining = page.getByRole("menuitem", {
      name: "Show hidden objects (1)",
      exact: true,
    })
    await remaining.focus()
    await remaining.press("ArrowRight")
    await expect(
      page.getByRole("menuitem", { name: 'Show "Lid"', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole("menuitem", { name: 'Show "Battery"', exact: true }),
    ).toHaveCount(0)
    await page.keyboard.press("ArrowLeft")
    const nextEngine = engine === "jscad" ? "Manifold" : "JSCAD"
    await page
      .getByRole("menuitem", {
        name: new RegExp(`^Switch to ${nextEngine} Engine`),
      })
      .click()
    await expect(page.getByRole("menu")).toHaveCount(0)
    await expect(viewer).toHaveAttribute("data-ready", "true")
    canvas = await mainCanvas(viewer)
    await openBackgroundMenu({ page, canvas })
    await expect(remaining).toBeVisible()
    await page
      .getByRole("menuitem", { name: "Unhide All Components", exact: true })
      .click()
    await openBackgroundMenu({ page, canvas })
    await expect(
      page.getByRole("menuitem", { name: /^Show hidden objects/ }),
    ).toHaveCount(0)
    await closeMenu(page, canvas)
    await page.mouse.click(batteryPoint.x, batteryPoint.y, { button: "right" })
    await page
      .getByRole("menuitem", { name: 'Hide "Battery"', exact: true })
      .click()
    await page
      .getByRole("button", { name: "Switch circuit", exact: true })
      .click()
    await openBackgroundMenu({ page, canvas })
    await expect(
      page.getByRole("menuitem", { name: /^Show hidden objects/ }),
    ).toHaveCount(0)
    await expect(
      page.getByRole("menuitem", {
        name: "Unhide All Components",
        exact: true,
      }),
    ).toHaveCount(0)
    expect(errors).toEqual([])
    await closeMenu(page, await mainCanvas(viewer))
    // Loading the replacement circuit is asynchronous; prove it is visible
    // before capturing the restored scene rather than accepting a blank canvas.
    await expect(async () => {
      const point = await objectPoint({
        canvas: await mainCanvas(viewer),
        xMm: 0,
      })
      await page.mouse.click(point.x, point.y, { button: "right" })
      await expect(
        page.getByRole("menuitem", { name: 'Hide "Battery"', exact: true }),
      ).toBeVisible({ timeout: 1000 })
      await closeMenu(page, await mainCanvas(viewer))
    }).toPass({ timeout: 30_000 })
    expect(errors).toEqual([])
    await page.screenshot({ path: testInfo.outputPath("restored-objects.png") })
  })
}
