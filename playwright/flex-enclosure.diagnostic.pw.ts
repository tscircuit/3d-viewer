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

for (const material of ["flex", "fr4", "fr1"] as const) {
  for (const shape of ["ring", "flat"] as const) {
    for (const engine of shape === "ring"
      ? ["manifold"]
      : ["manifold", "jscad"]) {
      test(`${material} ${shape} ${engine}: enclosure occludes textures and exposed copper remains visible`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width: 1000, height: 800 })
        const params = new URLSearchParams({ material, engine })
        if (shape === "flat") params.set("flat", "1")
        await page.goto(`flex-enclosure.html?${params}`)
        await page.waitForFunction(() => {
          let ready = false
          window.__TSCIRCUIT_THREE_OBJECT?.traverse((object: any) => {
            if (
              object.name.includes("board-texture") &&
              object.material.map?.image
            )
              ready = true
          })
          return ready && Boolean(window.enclosureCamera)
        })
        await page.waitForTimeout(1500)
        const target: [number, number, number] = [
          0,
          0,
          shape === "flat" ? 0 : 10,
        ]
        const positions: [number, number, number][] =
          shape === "ring"
            ? [
                [25, -30, 30],
                [30, -15, 12],
              ]
            : [
                [25, -30, 1.25],
                [25, -30, -1.25],
              ]
        const canvas = page.locator("canvas").last()
        async function textures(visible: boolean) {
          await page.evaluate((visible) => {
            window.__TSCIRCUIT_THREE_OBJECT!.traverse((object) => {
              if (object.name.includes("board-texture"))
                object.visible = visible
            })
          }, visible)
        }
        for (const [i, position] of positions.entries()) {
          await page.evaluate(
            ({ position, target }) => {
              window.enclosureCamera!.animateTo({
                position,
                target,
                durationMs: 1,
              })
            },
            { position, target },
          )
          await page.waitForTimeout(500)
          const withCopper = await stableScreenshot(canvas)
          await textures(false)
          const withoutCopper = await stableScreenshot(canvas)
          await testInfo.attach(`with-${i}`, {
            body: withCopper,
            contentType: "image/png",
          })
          await testInfo.attach(`without-${i}`, {
            body: withoutCopper,
            contentType: "image/png",
          })
          const changed = await changedPixels(withCopper, withoutCopper)
          console.log(
            `${material} ${shape} ${engine} angle ${i}: ${changed} changed pixels`,
          )
          // Allow a few antialiased silhouette pixels, but no copper lines.
          expect(changed).toBeLessThanOrEqual(4)
          await textures(true)
        }
        // Positive control: removing the enclosure must expose visible textures.
        await page.evaluate(() => {
          window.__TSCIRCUIT_THREE_OBJECT!.traverse((object: any) => {
            if (object.isMesh && object.material.vertexColors && !object.name)
              object.visible = false
          })
          window.enclosureCamera!.animateTo({
            position: [25, -30, 30],
            target: [0, 0, 0],
            durationMs: 1,
          })
        })
        await page.waitForTimeout(500)
        const exposed = await stableScreenshot(canvas)
        await textures(false)
        const withoutTextures = await stableScreenshot(canvas)
        expect(await changedPixels(exposed, withoutTextures)).toBeGreaterThan(
          100,
        )
      })
    }
  }
}
