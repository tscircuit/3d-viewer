import type { AnyCircuitElement } from "circuit-json"
import { expect, test } from "bun:test"
import { measurements } from "@jscad/modeling"
import { createSimplifiedBoardGeom } from "../src/soup-to-3d"
import { colors } from "../src/geoms/constants"

const { measureBoundingBox, measureVolume } = measurements

test("createSimplifiedBoardGeom includes pcb_panel geometry", () => {
  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_panel",
      pcb_panel_id: "panel_1",
      width: 40,
      height: 30,
      covered_with_solder_mask: true,
    },
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      thickness: 1.2,
      num_layers: 2,
      width: 20,
      height: 10,
      material: "fr4",
    },
  ]

  const geoms = createSimplifiedBoardGeom(circuit)

  expect(geoms.length).toBe(2)

  const boundingBoxes = geoms.map((geom) => measureBoundingBox(geom))
  const widths = boundingBoxes.map(([[minX], [maxX]]) => maxX - minX)

  expect(widths).toContain(40)
  expect(widths).toContain(20)

  const panelGeom = geoms.find((geom: any) => {
    if (!geom || !geom.color) return false
    const [r, g, b] = geom.color
    const [cr, cg, cb] = colors.fr4GreenSolderWithMask
    return (
      Math.abs(r - cr) < 1e-6 &&
      Math.abs(g - cg) < 1e-6 &&
      Math.abs(b - cb) < 1e-6
    )
  })

  expect(panelGeom).toBeDefined()

  const panelVolume = measureVolume(panelGeom!)
  const expectedPanelVolume = (40 * 30 - 20 * 10) * 1.2
  expect(panelVolume).toBeCloseTo(expectedPanelVolume, 5)
})

test("createSimplifiedBoardGeom subtracts all boards from panel", () => {
  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_panel",
      pcb_panel_id: "panel_1",
      width: 100,
      height: 50,
      covered_with_solder_mask: true,
    },
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: -20, y: 0 },
      thickness: 1.2,
      num_layers: 2,
      width: 20,
      height: 10,
      material: "fr4",
    },
    {
      type: "pcb_board",
      pcb_board_id: "board_2",
      center: { x: 25, y: 5 },
      thickness: 1.2,
      num_layers: 4,
      width: 30,
      height: 15,
      material: "fr4",
    },
  ]

  const geoms = createSimplifiedBoardGeom(circuit)

  expect(geoms.length).toBe(3)

  const boundingBoxes = geoms.map((geom) => measureBoundingBox(geom))
  const widths = boundingBoxes.map(([[minX], [maxX]]) => maxX - minX)

  expect(widths).toContain(100)
  expect(widths).toContain(20)
  expect(widths).toContain(30)

  const panelGeom = geoms.find((geom: any) => {
    if (!geom || !geom.color) return false
    const [r, g, b] = geom.color
    const [cr, cg, cb] = colors.fr4GreenSolderWithMask
    return (
      Math.abs(r - cr) < 1e-6 &&
      Math.abs(g - cg) < 1e-6 &&
      Math.abs(b - cb) < 1e-6
    )
  })

  expect(panelGeom).toBeDefined()

  const panelVolume = measureVolume(panelGeom!)
  const expectedPanelVolume = (100 * 50 - (20 * 10 + 30 * 15)) * 1.2
  expect(panelVolume).toBeCloseTo(expectedPanelVolume, 5)
})
