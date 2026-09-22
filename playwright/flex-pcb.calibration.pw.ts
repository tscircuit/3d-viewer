import { expect, test } from "@playwright/test"

test("right-click switches the capsule between flat and folded geometry", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("flex.html")
  const state = () => page.evaluate(() => (window as any).readFlexScene())
  await expect.poll(state).toMatchObject({ folded: false, immutable: true })
  const flat = await state()
  expect(flat.size[0]).toBeGreaterThan(50)
  expect(flat.size[2]).toBeLessThan(4)
  const canvas = page.locator("canvas").first()
  await canvas.click({ button: "right", position: { x: 100, y: 100 } })
  const fold = page.getByRole("menuitemcheckbox", { name: "Fold PCBs" })
  await expect(fold).not.toBeChecked()
  await fold.click()
  await expect.poll(state).toMatchObject({ folded: true, immutable: true })
  const folded = await state()
  expect(folded.size[0]).toBeLessThan(20)
  expect(folded.size[2]).toBeGreaterThan(12)
  const led = folded.nodes.find(
    (node: { name: string }) => node.name === "LED1",
  )
  expect(led.center[2]).toBeGreaterThan(12)
  expect(
    flat.nodes.find((node: { name: string }) => node.name === "LED1").center[2],
  ).toBeLessThan(3)
  await page.screenshot({ path: "test-results/flex-pcb-folded.png" })
  await canvas.hover()
  await page.keyboard.press("Shift+s")
  await expect
    .poll(
      async () =>
        (await state()).nodes.find(
          (node: { name: string }) => node.name === "LED1",
        ).visible,
    )
    .toBe(false)
  await page.keyboard.press("Shift+s")
  await expect
    .poll(
      async () =>
        (await state()).nodes.find(
          (node: { name: string }) => node.name === "LED1",
        ).visible,
    )
    .toBe(true)
  await canvas.click({ button: "right", position: { x: 100, y: 100 } })
  await expect(fold).toBeChecked()
  await fold.click()
  await expect.poll(state).toMatchObject(flat)
  expect(errors).toEqual([])
})

test("boards without bends do not offer folding", async ({ page }) => {
  await page.goto("flex.html?mode=rigid")
  await page
    .locator("canvas")
    .first()
    .click({ button: "right", position: { x: 100, y: 100 } })
  await expect(page.getByRole("menu")).toBeVisible()
  await expect(
    page.getByRole("menuitemcheckbox", { name: "Fold PCBs" }),
  ).toHaveCount(0)
})

test("a failed fold can be turned off to restore the flat view", async ({
  page,
}) => {
  await page.goto("flex.html?mode=invalid")
  const state = () => page.evaluate(() => (window as any).readFlexScene())
  await expect.poll(state).toMatchObject({ folded: false, immutable: true })
  await page
    .locator("canvas")
    .first()
    .click({ button: "right", position: { x: 100, y: 100 } })
  await page.getByRole("menuitemcheckbox", { name: "Fold PCBs" }).click()
  await expect(page.getByRole("alert")).toContainText("Unable to render PCB")
  await page.getByRole("alert").click({ button: "right" })
  const fold = page.getByRole("menuitemcheckbox", { name: "Fold PCBs" })
  await expect(fold).toBeChecked()
  await fold.press("Enter")
  await expect.poll(state).toMatchObject({ folded: false, immutable: true })
  await expect(page.getByRole("alert")).toHaveCount(0)
})
