import { expect, test } from "bun:test"
import { measureBoundingBox } from "@jscad/modeling/src/measurements"
import { createHoleWithPolygonPadHoleGeom } from "../src/geoms/create-hole-with-polygon-pad"
import { platedHole } from "../src/geoms/plated-hole"
import {
  getRotatedPolygonPadOutline,
  rotatePolygonPadPoint,
} from "../src/geoms/polygon-pad-placement"

// 6mm x 1mm bar with the drill offset at the right end
const bar = {
  type: "pcb_plated_hole",
  pcb_plated_hole_id: "ph_polygon",
  shape: "hole_with_polygon_pad",
  hole_shape: "circle",
  hole_diameter: 0.8,
  x: 10,
  y: 5,
  hole_offset_x: 2,
  hole_offset_y: 0,
  pad_outline: [
    { x: -3, y: -0.5 },
    { x: 3, y: -0.5 },
    { x: 3, y: 0.5 },
    { x: -3, y: 0.5 },
  ],
  layers: ["top", "bottom"],
} as any

test("rotatePolygonPadPoint rotates around the origin", () => {
  expect(rotatePolygonPadPoint({ x: 2, y: 0 }, undefined)).toEqual({
    x: 2,
    y: 0,
  })
  const rotated = rotatePolygonPadPoint({ x: 2, y: 0 }, 90)
  expect(rotated.x).toBeCloseTo(0, 9)
  expect(rotated.y).toBeCloseTo(2, 9)
  expect(getRotatedPolygonPadOutline(bar.pad_outline, 180)[1]!.x).toBeCloseTo(
    -3,
    9,
  )
})

test("polygon pad copper follows ccw_rotation (jscad path)", () => {
  const ctx = { pcbThickness: 1.6 } as any
  const unrotated = measureBoundingBox(platedHole(bar, ctx))
  const rotated = measureBoundingBox(
    platedHole({ ...bar, ccw_rotation: 90 }, ctx),
  )

  // horizontal 6 x 1 bar becomes a vertical 1 x 6 bar around (10, 5)
  expect(unrotated[1][0] - unrotated[0][0]).toBeCloseTo(6, 3)
  expect(unrotated[1][1] - unrotated[0][1]).toBeCloseTo(1, 3)
  expect(rotated[1][0] - rotated[0][0]).toBeCloseTo(1, 3)
  expect(rotated[1][1] - rotated[0][1]).toBeCloseTo(6, 3)
  expect((rotated[0][0] + rotated[1][0]) / 2).toBeCloseTo(10, 3)
  expect((rotated[0][1] + rotated[1][1]) / 2).toBeCloseTo(5, 3)
})

test("polygon pad drill offset follows ccw_rotation", () => {
  const before = measureBoundingBox(createHoleWithPolygonPadHoleGeom(bar, 2)!)
  const after = measureBoundingBox(
    createHoleWithPolygonPadHoleGeom({ ...bar, ccw_rotation: 90 }, 2)!,
  )
  // drill center moves from (12, 5) to (10, 7)
  expect((before[0][0] + before[1][0]) / 2).toBeCloseTo(12, 3)
  expect((before[0][1] + before[1][1]) / 2).toBeCloseTo(5, 3)
  expect((after[0][0] + after[1][0]) / 2).toBeCloseTo(10, 3)
  expect((after[0][1] + after[1][1]) / 2).toBeCloseTo(7, 3)
})
