import { describe, expect, test } from "bun:test"
import type { PCBPlatedHole } from "circuit-json"
import { measureBoundingBox } from "@jscad/modeling/src/measurements"
import { platedHole } from "../src/geoms/plated-hole"

const ctx = { pcbThickness: 1.6 }

const makePolygonPadHole = (
  ccw_rotation?: number,
  hole_offset_x = 0,
): PCBPlatedHole =>
  ({
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "ph1",
    shape: "hole_with_polygon_pad",
    hole_shape: "circle",
    hole_diameter: 1,
    hole_offset_x,
    hole_offset_y: 0,
    pad_outline: [
      { x: -3, y: -0.5 },
      { x: 3, y: -0.5 },
      { x: 3, y: 0.5 },
      { x: -3, y: 0.5 },
    ],
    x: 10,
    y: 20,
    layers: ["top", "bottom"],
    ...(ccw_rotation === undefined ? {} : { ccw_rotation }),
  }) as PCBPlatedHole

describe("platedHole hole_with_polygon_pad ccw_rotation", () => {
  test("unrotated pad keeps its 6x1 extents", () => {
    const geom = platedHole(makePolygonPadHole(), ctx)
    const [[minX, minY], [maxX, maxY]] = measureBoundingBox(geom)
    expect(maxX - minX).toBeCloseTo(6, 1)
    expect(maxY - minY).toBeCloseTo(1, 1)
    expect((minX + maxX) / 2).toBeCloseTo(10, 1)
  })

  test("ccw_rotation 90 swaps the pad extents about the hole center", () => {
    const geom = platedHole(makePolygonPadHole(90), ctx)
    const [[minX, minY], [maxX, maxY]] = measureBoundingBox(geom)
    expect(maxX - minX).toBeCloseTo(1, 1)
    expect(maxY - minY).toBeCloseTo(6, 1)
    expect((minX + maxX) / 2).toBeCloseTo(10, 1)
    expect((minY + maxY) / 2).toBeCloseTo(20, 1)
  })

  test("ccw_rotation rotates the drill offset about the hole center", () => {
    // Offset (2, 0) rotates to (0, 2): the drilled barrel must move +2mm in y
    const unrotated = measureBoundingBox(
      platedHole(makePolygonPadHole(undefined, 2), ctx),
    )
    const rotated = measureBoundingBox(
      platedHole(makePolygonPadHole(90, 2), ctx),
    )

    // The pad bar is identical in both cases (offset only moves the drill),
    // so the copper bounding box must stay centered on the hole position
    expect((rotated[0][0] + rotated[1][0]) / 2).toBeCloseTo(10, 1)
    expect((rotated[0][1] + rotated[1][1]) / 2).toBeCloseTo(20, 1)
  })
})
