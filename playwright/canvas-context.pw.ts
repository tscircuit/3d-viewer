import { expect, test } from "@playwright/test"

test("unmounting the 3D canvas releases its WebGL context", async ({
  page,
}) => {
  await page.goto("canvas-context.html")
  const canvas = page.locator("canvas")
  await expect(canvas).toHaveCount(1)
  const oldContext = await canvas.evaluateHandle((element: HTMLCanvasElement) =>
    element.getContext("webgl2"),
  )
  expect(await oldContext.evaluate((context) => context?.isContextLost())).toBe(
    false,
  )

  await page.getByRole("button", { name: "Unmount canvas" }).click()
  await expect(canvas).toHaveCount(0)
  await page.getByRole("button", { name: "Mount canvas" }).click()
  await expect(canvas).toHaveCount(1)
  expect(
    await canvas.evaluate((element: HTMLCanvasElement) =>
      element.getContext("webgl2")?.isContextLost(),
    ),
  ).toBe(false)

  await expect
    .poll(() => oldContext.evaluate((context) => context?.isContextLost()), {
      timeout: 3000,
    })
    .toBe(true)
})
