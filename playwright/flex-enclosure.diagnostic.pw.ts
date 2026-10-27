import { expect, test, type Locator } from "@playwright/test"
import { createCanvas, loadImage } from "@napi-rs/canvas"

async function stableScreenshot(canvas: Locator) {
  let previous = await canvas.screenshot()
  for (let i = 0; i < 30; i++) {
    const current = await canvas.screenshot()
    if (current.equals(previous)) return current
    previous = current
  }
  throw new Error("Viewer did not settle after orbiting")
}

async function changedPixels(before: Buffer, after: Buffer) {
  const images = await Promise.all([loadImage(before), loadImage(after)])
  const pixels = images.map((image) => {
    const context = createCanvas(image.width, image.height).getContext("2d")
    context.drawImage(image, 0, 0)
    return context.getImageData(0, 0, image.width, image.height).data
  })
  let changed = 0
  for (let i = 0; i < pixels[0]!.length; i += 4) {
    if (
      [0, 1, 2].some(
        (c) => Math.abs(pixels[0]![i + c]! - pixels[1]![i + c]!) > 16,
      )
    )
      changed++
  }
  return changed
}

test("opaque enclosure occludes folded PCB textures at grazing angles", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1000, height: 800 })
  await page.goto("flex-enclosure.html")
  await page.waitForFunction(() => {
    let ready = false
    window.__TSCIRCUIT_THREE_OBJECT?.traverse((object: any) => {
      if (
        object.name === "top-board-texture-plane" &&
        object.material.map?.image &&
        object.geometry.attributes.position.count > 6
      )
        ready = true
    })
    return ready
  })
  // Let the enclosure model and the first shadow map finish rendering.
  await page.waitForTimeout(2000)

  for (const orbit of [false, true]) {
    if (orbit) {
      await page.mouse.move(500, 400)
      await page.mouse.down()
      await page.mouse.move(650, 450, { steps: 20 })
      await page.mouse.up()
      await page.waitForTimeout(1000)
    }
    const canvas = page.locator("canvas").last()
    const withCopper = await stableScreenshot(canvas)
    await page.evaluate(() => {
      window.__TSCIRCUIT_THREE_OBJECT!.traverse((object) => {
        if (object.name.endsWith("board-texture-plane")) object.visible = false
      })
    })
    await page.waitForTimeout(200)
    const withoutCopper = await stableScreenshot(canvas)
    // Removing enclosed textures must leave the shell unchanged. Allow a
    // few antialiased silhouette pixels, but no copper lines through it.
    await testInfo.attach(`with-${orbit}`, {
      body: withCopper,
      contentType: "image/png",
    })
    await testInfo.attach(`without-${orbit}`, {
      body: withoutCopper,
      contentType: "image/png",
    })
    expect(await changedPixels(withCopper, withoutCopper)).toBeLessThanOrEqual(
      4,
    )
    await page.evaluate(() => {
      window.__TSCIRCUIT_THREE_OBJECT!.traverse((object) => {
        if (object.name.endsWith("board-texture-plane")) object.visible = true
      })
    })
    await page.waitForTimeout(200)
  }
})
