import { expect, test } from "bun:test"
import { measureBoundingBox } from "@jscad/modeling/src/measurements"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { BoardGeomBuilder } from "../src/BoardGeomBuilder"
import { createSimplifiedBoardGeom } from "../src/soup-to-3d"
import {
  createMultiBoardEnvelope,
  getUnpanelizedBoards,
} from "../src/utils/multi-board"
import twoBoards from "../stories/assets/two-boards.json"

const circuitJson = twoBoards as AnyCircuitElement[]

test("standalone boards are all selected for rendering", () => {
  const boards = getUnpanelizedBoards(circuitJson)
  expect(boards.map((board) => board.center)).toEqual([
    { x: 0, y: 0 },
    { x: 0, y: 28 },
  ])
})

test("boards inside a panel are not rendered on their own", () => {
  const panelized = circuitJson.map((element) =>
    element.type === "pcb_board"
      ? { ...element, pcb_panel_id: "pcb_panel_0" }
      : element,
  ) as AnyCircuitElement[]
  expect(getUnpanelizedBoards(panelized)).toEqual([])
})

test("the texture envelope covers every board and has no outline", () => {
  const boards = getUnpanelizedBoards(circuitJson)
  const envelope = createMultiBoardEnvelope(boards)

  // Two 30x20mm boards, the second 28mm above the first
  expect(envelope.center).toEqual({ x: 0, y: 14 })
  expect(envelope.width).toBeCloseTo(30)
  expect(envelope.height).toBeCloseTo(48)
  expect(envelope.outline).toBeUndefined()
  expect(envelope.thickness).toBe((boards[0] as PcbBoard).thickness)
})

test("JSCAD simplified and detailed board builders render every standalone board", () => {
  const simplifiedGeoms = createSimplifiedBoardGeom(circuitJson)
  expect(simplifiedGeoms).toHaveLength(1)
  const simplifiedBounds = measureBoundingBox(simplifiedGeoms[0]!)
  expect(simplifiedBounds[0][0]).toBeCloseTo(-15)
  expect(simplifiedBounds[1][0]).toBeCloseTo(15)
  expect(simplifiedBounds[0][1]).toBeCloseTo(-10)
  expect(simplifiedBounds[1][1]).toBeCloseTo(38)

  const builder = new BoardGeomBuilder(circuitJson, () => {})
  while (!builder.step(100)) {}
  const detailedGeoms = builder.getGeoms()
  expect(detailedGeoms.length).toBeGreaterThanOrEqual(1)
  const detailedBounds = measureBoundingBox(detailedGeoms[0]!)
  expect(detailedBounds[0][0]).toBeCloseTo(-15)
  expect(detailedBounds[1][0]).toBeCloseTo(15)
  expect(detailedBounds[0][1]).toBeCloseTo(-10)
  expect(detailedBounds[1][1]).toBeCloseTo(38)
})
