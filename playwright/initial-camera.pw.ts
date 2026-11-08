import { readFile } from "node:fs/promises"
import { expect, test } from "@playwright/test"

function expectSameVector(actual: number[], expected: number[]) {
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i]!, 8))
}

// Serve the installed matching runtime so camera tests do not depend on a CDN.
test.beforeEach(async ({ page }) => {
  await page.route(
    "https://cdn.jsdelivr.net/npm/manifold-3d@3.5.1/*",
    async (route) => {
      const name = new URL(route.request().url()).pathname.split("/").pop()!
      await route.fulfill({
        body: await readFile(
          new URL(`../node_modules/manifold-3d/${name}`, import.meta.url),
        ),
        contentType: name.endsWith(".wasm")
          ? "application/wasm"
          : "text/javascript",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cross-Origin-Resource-Policy": "cross-origin",
        },
      })
    },
  )
})

for (const engine of ["manifold", "jscad"]) {
  for (const projection of ["perspective", "orthographic"]) {
    test(`${engine}/${projection}: fresh FLEX17 fits, presets stay centered, and reload restores user zoom`, async ({
      page,
    }, testInfo) => {
      await page.goto(
        `initial-camera.html?engine=${engine}&projection=${projection}`,
      )
      await expect
        .poll(() =>
          page.evaluate(() => window.__cameraTest?.snapshot()?.meshes ?? 0),
        )
        .toBeGreaterThanOrEqual(59)
      await expect
        .poll(() =>
          page.evaluate(() => window.__cameraTest.snapshot()?.outside),
        )
        .toBe(0)
      await testInfo.attach("fresh-flex17", {
        body: await page.screenshot(),
        contentType: "image/png",
      })

      await page.evaluate(() => window.__cameraTest.preset("Top Down"))
      await expect
        .poll(() =>
          page.evaluate(() => {
            const state = window.__cameraTest.snapshot()!
            return Math.hypot(
              state.position[0]! - state.center[0]!,
              state.position[1]! - state.center[1]!,
            )
          }),
        )
        .toBeLessThan(0.001)
      await expect
        .poll(() =>
          page.evaluate(() => window.__cameraTest.snapshot()?.outside),
        )
        .toBe(0)

      const beforeZoom = await page.evaluate(
        () => window.__cameraTest.snapshot()!,
      )
      await page.mouse.move(550, 400)
      await page.mouse.wheel(0, 200)
      await expect
        .poll(() =>
          page.evaluate(() => {
            const state = window.__cameraTest.snapshot()!
            return [...state.position, state.zoom]
          }),
        )
        .not.toEqual([...beforeZoom.position, beforeZoom.zoom])
      // Camera persistence is debounced; allow damping and the save to settle.
      await page.waitForTimeout(700)
      const zoomed = await page.evaluate(() => window.__cameraTest.snapshot()!)
      await page.reload()
      await expect
        .poll(() =>
          page.evaluate(() => window.__cameraTest?.snapshot()?.meshes ?? 0),
        )
        .toBeGreaterThanOrEqual(59)
      await expect
        .poll(() =>
          page.evaluate((previous) => {
            const state = window.__cameraTest.snapshot()!
            return Math.max(
              ...state.position.map((v, i) =>
                Math.abs(v - previous.position[i]!),
              ),
              Math.abs(state.zoom - previous.zoom),
            )
          }, zoomed),
        )
        .toBeLessThan(0.00001)
    })
  }

  test(`${engine}: off-origin board framing and presets remain centered`, async ({
    page,
  }) => {
    await page.goto(`initial-camera.html?engine=${engine}&fixture=board`)
    await expect
      .poll(() =>
        page.evaluate(() => window.__cameraTest?.snapshot()?.meshes ?? 0),
      )
      .toBeGreaterThan(0)
    const initial = await page.evaluate(() => window.__cameraTest.snapshot()!)
    expect(initial.position[0]).toBeCloseTo(417 + 86.4 * 0.4)
    expect(initial.position[1]).toBeCloseTo(293 - 86.4 * 0.7)
    expect(initial.position[2]).toBeCloseTo(86.4 * 0.9)
    await page.evaluate(() => window.__cameraTest.preset("Top Down"))
    await expect
      .poll(() =>
        page.evaluate(() => {
          const position = window.__cameraTest.snapshot()!.position
          return Math.hypot(position[0]! - 417, position[1]! - 293)
        }),
      )
      .toBeLessThan(0.001)
    await expect
      .poll(() => page.evaluate(() => window.__cameraTest.snapshot()?.outside))
      .toBe(0)
  })
}

test("replacing a GLB preserves the camera and canvas", async ({ page }) => {
  for (const [url, asset] of [
    ["initial.glb", "prerendered-board.glb"],
    ["replacement.glb", "prerendered-components.glb"],
  ]) {
    await page.route(`**/${url}`, (route) =>
      route.fulfill({
        path: new URL(`../tests/assets/${asset}`, import.meta.url).pathname,
        contentType: "model/gltf-binary",
      }),
    )
  }
  await page.goto("initial-camera.html?fixture=glb")
  await expect
    .poll(() =>
      page.evaluate(() => window.__cameraTest?.snapshot()?.meshes ?? 0),
    )
    .toBeGreaterThan(0)
  await page.mouse.move(550, 400)
  await page.mouse.wheel(0, 200)
  await page.waitForTimeout(500)
  const before = await page.evaluate(() => window.__cameraTest.snapshot()!)
  const canvas = await page.locator("canvas").last().elementHandle()
  await Promise.all([
    page.waitForResponse("**/replacement.glb"),
    page.getByRole("button", { name: "Replace GLB" }).click(),
  ])
  await page.waitForTimeout(500)
  expect(await canvas!.evaluate((element) => element.isConnected)).toBe(true)
  const after = await page.evaluate(() => window.__cameraTest.snapshot()!)
  expectSameVector(after.position, before.position)
  expectSameVector(after.quaternion, before.quaternion)
})

test("FLEX17 explosion scrubbing keeps the initial camera", async ({
  page,
}) => {
  await page.goto("initial-camera.html")
  await expect
    .poll(() =>
      page.evaluate(() => window.__cameraTest?.snapshot()?.meshes ?? 0),
    )
    .toBeGreaterThanOrEqual(59)
  await expect
    .poll(() => page.evaluate(() => window.__cameraTest.snapshot()?.outside))
    .toBe(0)
  const before = await page.evaluate(() => window.__cameraTest.snapshot()!)
  await page
    .locator("canvas")
    .last()
    .click({ button: "right", position: { x: 500, y: 350 } })
  await page.getByRole("menuitem", { name: "Advanced", exact: true }).hover()
  await page
    .getByRole("menuitem", { name: "Exploded view…", exact: true })
    .click()
  const slider = page.getByRole("slider", { name: "Assembly explosion" })
  for (const amount of [1, 6, 18, 0]) {
    await slider.fill(String(amount))
    await page.waitForTimeout(150)
    const after = await page.evaluate(() => window.__cameraTest.snapshot()!)
    expectSameVector(after.position, before.position)
    expectSameVector(after.quaternion, before.quaternion)
  }
})

test("click-to-interact attaches controls without losing the fitted view", async ({
  page,
}) => {
  await page.goto("initial-camera.html?clickToInteract")
  await expect
    .poll(() =>
      page.evaluate(() => window.__cameraTest?.snapshot()?.meshes ?? 0),
    )
    .toBeGreaterThanOrEqual(59)
  await expect
    .poll(() => page.evaluate(() => window.__cameraTest.snapshot()?.outside))
    .toBe(0)
  const before = await page.evaluate(() => window.__cameraTest.snapshot()!)
  await page.getByRole("button", { name: "Click to Interact" }).click()
  await page.waitForTimeout(300)
  const after = await page.evaluate(() => window.__cameraTest.snapshot()!)
  expectSameVector(after.position, before.position)
  expectSameVector(after.quaternion, before.quaternion)
  expect(after.outside).toBe(0)
})
