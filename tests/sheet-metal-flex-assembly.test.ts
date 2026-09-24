import { expect, test } from "bun:test"
import { modelDefinitionSchema } from "modelprinter"
import { z } from "zod"
import type { CadComponent } from "circuit-json"
import {
  createPcbFold,
  transformCircuitJsonCadComponents,
} from "@tscircuit/flex-utils"
import { createSheetMetalFlexAssembly } from "../stories/fixtures/create-sheet-metal-flex-assembly"

test("routed four-bend flex clears the metal wall and preserves standalone CAD", async () => {
  const circuitJson = await createSheetMetalFlexAssembly()
  expect(circuitJson.filter((e) => e.type === "pcb_trace_error")).toEqual([])
  expect(
    circuitJson.filter((e) => e.type === "pcb_trace").length,
  ).toBeGreaterThan(0)
  const board = circuitJson.find((e) => e.type === "pcb_board")!
  if (board.type !== "pcb_board") throw new Error("Missing PCB")
  const bends = circuitJson.filter((e) => e.type === "pcb_bend")
  expect(bends).toHaveLength(4)
  const fold = createPcbFold(bends, board.thickness)
  // The right wall's X interval is [14,15], its upper edge is Z=14.5.
  // Test emitted fold positions through the entire over-the-lip section.
  for (let x = 7; x < 52; x += 0.1) {
    const point = fold.point({ x: x - board.center.x, y: 0, z: 0 })
    const worldX = point.x + board.center.x
    if (worldX >= 14 && worldX <= 15) expect(point.z).toBeGreaterThan(16)
  }
  const models = circuitJson.filter(
    (e): e is CadComponent =>
      e.type === "cad_component" && Boolean(e.model_obj_url),
  )
  expect(models).toHaveLength(3)
  expect(models.every((e) => e.pcb_component_id === undefined)).toBe(true)
  const flat = transformCircuitJsonCadComponents(circuitJson, {
    foldPcbs: false,
  })
  expect(
    flat.filter((e) => e.type === "cad_component" && e.model_obj_url),
  ).toEqual(models)
  const foldedElectronics = circuitJson.filter(
    (e): e is CadComponent =>
      e.type === "cad_component" && Boolean(e.is_on_folded_board),
  )
  const externalLed = foldedElectronics.find(
    (e) => Math.abs(e.position.x - 18.575) < 0.01,
  )!
  expect(externalLed.position.z).toBeCloseTo(8.5, 4)
})

test("modelprinter uses the viewer consumer Zod instance", () => {
  expect(modelDefinitionSchema).toBeInstanceOf(z.ZodType)
})
