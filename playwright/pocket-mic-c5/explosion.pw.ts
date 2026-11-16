import { readFileSync } from "node:fs"
import { expect, type Page, test } from "@playwright/test"
import type { AnyCircuitElement } from "circuit-json"

const pcbBoardId = "pcb_board_0"
const trayCadId = "enclosure_cad_component_0"
const lidCadId = "enclosure_cad_component_1"
const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../stories/fixtures/pocket-mic-c5-rx/assembled.circuit.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as AnyCircuitElement[]
const fittedCadIds = fixture
  .filter((entry) => entry.type === "cad_component")
  .filter((entry) => entry.pcb_component_id)
  .map((entry) => entry.cad_component_id)
const movingIds = [pcbBoardId, ...fittedCadIds]

function getScenePositions(page: Page) {
  return page.evaluate(() => {
    const positions: Record<string, number[]> = {}
    const root = window.__TSCIRCUIT_THREE_OBJECT
    if (!root) return positions
    root.updateMatrixWorld(true)
    const sceneFromWorld = root.matrixWorld.clone().invert()
    root.traverse((object) => {
      const id =
        object.userData.cad_component_id ?? object.userData.pcb_board_id
      if (typeof id !== "string") return
      const objectToScene = sceneFromWorld.clone().multiply(object.matrixWorld)
      positions[id] = objectToScene.elements.slice(12, 15)
    })
    return positions
  })
}

async function openReceiverExplosion(page: Page, engine: "manifold" | "jscad") {
  await page.goto(`pocket-mic-c5-explosion.html?engine=${engine}`)
  await expect
    .poll(async () => {
      const positions = await getScenePositions(page)
      return [...movingIds, trayCadId, lidCadId].every((id) => id in positions)
    })
    .toBe(true)
  const canvas = page.locator("canvas").last()
  await canvas.click({ button: "right", position: { x: 500, y: 400 } })
  await page.getByRole("menuitem", { name: "Advanced", exact: true }).hover()
  await page
    .getByRole("menuitem", { name: "Exploded view…", exact: true })
    .click()
  return page.getByRole("slider", { name: "Assembly explosion" })
}

function movingOffsets(
  initial: Awaited<ReturnType<typeof getScenePositions>>,
  current: Awaited<ReturnType<typeof getScenePositions>>,
) {
  return movingIds.map((id) =>
    current[id]?.map((coordinate, axis) =>
      Number((coordinate - initial[id]![axis]!).toFixed(5)),
    ),
  )
}

test("Manifold lifts and parks the populated C5 receiver PCB and resets its pose", async ({
  page,
}, testInfo) => {
  expect(fittedCadIds).toHaveLength(61)
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  const slider = await openReceiverExplosion(page, "manifold")
  const initial = await getScenePositions(page)
  const canvas = page.locator("canvas").last()
  const originalCanvas = await canvas.elementHandle()
  await page.mouse.move(1040, 100)
  await canvas.screenshot({ path: testInfo.outputPath("c5-rx-assembled.png") })

  await expect(slider).toHaveAttribute("max", "4")
  await slider.fill("2.5")
  await expect(slider).toHaveAttribute("aria-valuetext", "pocket-rx.lift-pcb")
  await expect
    .poll(async () => movingOffsets(initial, await getScenePositions(page)))
    .toEqual(movingIds.map(() => [0, 0, 6]))

  await slider.fill("4")
  await expect(slider).toHaveAttribute("aria-valuetext", "pocket-rx.park-pcb")
  await expect
    .poll(async () => movingOffsets(initial, await getScenePositions(page)))
    .toEqual(movingIds.map(() => [0, 36, 12]))

  const parked = await getScenePositions(page)
  expect(parked[trayCadId]).toEqual(initial[trayCadId])
  expect(parked[lidCadId]).toEqual([0, 0, 21])
  expect(await originalCanvas?.evaluate((canvas) => canvas.isConnected)).toBe(
    true,
  )
  await page.mouse.move(1040, 100)
  await canvas.screenshot({ path: testInfo.outputPath("c5-rx-pcb-parked.png") })

  await page.getByRole("button", { name: "Reset", exact: true }).click()
  await expect(slider).toHaveValue("0")
  await expect.poll(() => getScenePositions(page)).toEqual(initial)
  expect(errors).toEqual([])
})

test("JSCAD lifts the PCB and its 61 fitted models out of the stationary tray", async ({
  page,
}) => {
  const slider = await openReceiverExplosion(page, "jscad")
  const initial = await getScenePositions(page)
  await slider.fill("3")
  await expect(slider).toHaveAttribute("aria-valuetext", "pocket-rx.lift-pcb")
  await expect
    .poll(async () => movingOffsets(initial, await getScenePositions(page)))
    .toEqual(movingIds.map(() => [0, 0, 12]))
  const lifted = await getScenePositions(page)
  expect(lifted[trayCadId]).toEqual(initial[trayCadId])
})
