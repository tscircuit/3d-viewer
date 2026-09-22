import { expect, test } from "@playwright/test"

test("route vias render copper rings and clip silkscreen only on exposed faces", async ({
  page,
}) => {
  await page.goto("via-tenting.html")
  const results = page.getByTestId("texture-pixels")
  await expect(results).toContainText("inheritedText")
  const pixels = JSON.parse((await results.textContent())!)
  const white = [255, 255, 255, 255]
  const transparent = [0, 0, 0, 0]
  const copper = [230, 153, 51, 255]

  expect(pixels.top.inheritedText).toEqual(white)
  expect(pixels.top.overriddenText).toEqual(transparent)
  expect(pixels.bottom.inheritedText).toEqual(transparent)
  expect(pixels.bottom.overriddenText).toEqual(white)
  expect(pixels.topWithoutMask.inheritedText).toEqual(transparent)
  expect(pixels.topWithoutMask.overriddenText).toEqual(transparent)
  expect(pixels.bottomWithoutMask.inheritedText).toEqual(transparent)
  expect(pixels.bottomWithoutMask.overriddenText).toEqual(transparent)
  expect(pixels.top.inheritedRing).toEqual(copper)
  expect(pixels.top.overriddenRing).toEqual(copper)
  expect(pixels.bottom.inheritedRing).toEqual(copper)
  expect(pixels.bottom.overriddenRing).toEqual(copper)
  expect(pixels.top.drill).toEqual(transparent)
  expect(pixels.bottom.drill).toEqual(transparent)
})
