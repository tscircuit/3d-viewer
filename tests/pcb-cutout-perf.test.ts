import { expect, test } from "bun:test"
import { measureVolume } from "@jscad/modeling/src/measurements"
import { intersect } from "@jscad/modeling/src/operations/booleans"
import { cuboid } from "@jscad/modeling/src/primitives"
import type { AnyCircuitElement, PcbCutout, PcbHole } from "circuit-json"
import { BoardGeomBuilder } from "../src/BoardGeomBuilder"
import { createSimplifiedBoardGeom } from "../src/soup-to-3d"

const board = {
  type: "pcb_board",
  pcb_board_id: "board_1",
  center: { x: 0, y: 0 },
  width: 40,
  height: 40,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
} as const

const rectCutout: PcbCutout = {
  type: "pcb_cutout",
  pcb_cutout_id: "cutout_rect",
  shape: "rect",
  center: { x: 0, y: 0 },
  width: 6,
  height: 4,
}

const circleCutout: PcbCutout = {
  type: "pcb_cutout",
  pcb_cutout_id: "cutout_circle",
  shape: "circle",
  center: { x: 10, y: 10 },
  radius: 2,
}

test("createSimplifiedBoardGeom immediately subtracts pcb_cutout elements", () => {
  const simplifiedBoard = createSimplifiedBoardGeom([
    board,
    rectCutout,
    circleCutout,
  ] as AnyCircuitElement[])

  const centerProbe = cuboid({ center: [0, 0, 0], size: [2, 2, 1] })
  expect(
    Math.abs(measureVolume(intersect(simplifiedBoard, centerProbe))),
  ).toBeLessThan(1e-8)

  const circleProbe = cuboid({ center: [10, 10, 0], size: [1, 1, 1] })
  expect(
    Math.abs(measureVolume(intersect(simplifiedBoard, circleProbe))),
  ).toBeLessThan(1e-8)

  const intactBoardProbe = cuboid({ center: [-10, -10, 0], size: [2, 2, 1] })
  expect(
    measureVolume(intersect(simplifiedBoard, intactBoardProbe)),
  ).toBeGreaterThan(3.9)
})

test("BoardGeomBuilder batches cutout and hole subtractions quickly", () => {
  const holes: PcbHole[] = Array.from({ length: 24 }, (_, idx) => ({
    type: "pcb_hole",
    pcb_hole_id: `hole_${idx}`,
    hole_shape: "circle",
    hole_diameter: 0.8,
    x: -15 + (idx % 6) * 2,
    y: -15 + Math.floor(idx / 6) * 2,
  }))

  const start = performance.now()
  const builder = new BoardGeomBuilder(
    [board, rectCutout, circleCutout, ...holes] as AnyCircuitElement[],
    () => {},
  )
  while (!builder.step(16)) {}
  const elapsedMs = performance.now() - start

  const [finalBoardGeom] = builder.getGeoms()
  expect(finalBoardGeom).toBeDefined()

  const centerProbe = cuboid({ center: [0, 0, 0], size: [2, 2, 1] })
  expect(
    Math.abs(measureVolume(intersect(finalBoardGeom!, centerProbe))),
  ).toBeLessThan(1e-8)

  const holeProbe = cuboid({ center: [-15, -15, 0], size: [0.2, 0.2, 1] })
  expect(
    Math.abs(measureVolume(intersect(finalBoardGeom!, holeProbe))),
  ).toBeLessThan(1e-8)

  expect(elapsedMs).toBeLessThan(2000)
})
