import { expect, test, type Page } from "@playwright/test"

const visible = (page: Page) =>
  page.evaluate(() => window.__unhide.visibleNames())
const item = (page: Page, name: string) =>
  page.getByRole("menuitem", { name, exact: true })
const backgroundMenu = (page: Page) =>
  page.mouse.click(80, 80, { button: "right" })
const componentMenu = async (page: Page, name: string) => {
  const position = await page.evaluate(
    (name) => window.__unhide.position(name),
    name,
  )
  await page.mouse.click(position.x, position.y, { button: "right" })
}
const openSubmenu = async (page: Page) => {
  await item(page, "Unhide Components").hover()
  return page.getByRole("menu", { name: "Unhide Components", exact: true })
}

for (const engine of ["manifold", "jscad"]) {
  test(`unhide one component preserves the others in ${engine}`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(`unhide-components.html?engine=${engine}`)
    await expect.poll(() => visible(page)).toEqual(["U1", "U2", "U3"])
    await componentMenu(page, "U1")
    await expect(item(page, "Unhide Components")).toHaveCount(0)
    await item(page, 'Hide "U1"').click()
    await componentMenu(page, "U2")
    await item(page, 'Hide "U2"').click()
    await expect.poll(() => visible(page)).toEqual(["U3"])

    await backgroundMenu(page)
    await expect(item(page, "Unhide All")).toHaveCount(0)
    const submenu = await openSubmenu(page)
    await expect(submenu.getByRole("menuitem")).toHaveText([
      "Unhide All",
      "U1",
      "U2",
    ])
    if (engine === "manifold")
      await page.screenshot({
        path: "test-results/unhide-components-submenu.png",
      })
    await submenu.getByRole("menuitem", { name: "U1", exact: true }).click()
    await expect(page.getByRole("menu")).toHaveCount(0)
    await expect.poll(() => visible(page)).toEqual(["U1", "U3"])

    await backgroundMenu(page)
    await item(page, "Unhide Components").focus()
    await page.keyboard.press("ArrowRight")
    await expect(submenu.getByRole("menuitem")).toHaveText(["Unhide All", "U2"])
    await submenu.getByRole("menuitem", { name: "U2", exact: true }).focus()
    await page.keyboard.press("Enter")
    await expect.poll(() => visible(page)).toEqual(["U1", "U2", "U3"])
    await backgroundMenu(page)
    await expect(item(page, "Unhide Components")).toHaveCount(0)
    await expect(item(page, "Unhide All")).toHaveCount(0)
    await page.keyboard.press("Escape")

    await componentMenu(page, "U1")
    await item(page, 'Isolate "U1"').click()
    await expect.poll(() => visible(page)).toEqual(["U1"])
    await backgroundMenu(page)
    await openSubmenu(page)
    await submenu.getByRole("menuitem", { name: "U2", exact: true }).click()
    await expect.poll(() => visible(page)).toEqual(["U1", "U2"])
    await backgroundMenu(page)
    await openSubmenu(page)
    await expect(
      submenu.getByRole("menuitem", { name: "U2", exact: true }),
    ).toHaveCount(0)
    await submenu
      .getByRole("menuitem", { name: "Unhide All", exact: true })
      .click()
    await expect.poll(() => visible(page)).toEqual(["U1", "U2", "U3"])
    expect(errors).toEqual([])
  })
}
