import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { polygon } from "@jscad/modeling/src/primitives"
import type { Geom2, Geom3 } from "@jscad/modeling/src/geometries/types"
import type { Vec2 } from "@jscad/modeling/src/maths/types"
import type { Point } from "circuit-json"
import { translate } from "@jscad/modeling/src/operations/transforms"

export const arePointsClockwise = (points: Vec2[]): boolean => {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i]![0] * points[j]![1]
    area -= points[j]![0] * points[i]![1]
  }
  const signedArea = area / 2
  return signedArea <= 0
}

export const createBoardGeomWithOutline = (
  board: { center?: { x: number; y: number }; outline: Point[] },
  depth = 1.2,
): Geom3 => {
  const { outline } = board
  let outlineVec2: Vec2[] = outline.map((point) => [point.x, point.y])

  if (arePointsClockwise(outlineVec2)) {
    outlineVec2 = outlineVec2.reverse()
  }

  const shape: Geom2 = polygon({ points: outlineVec2 })

  let boardGeom: Geom3 = extrudeLinear({ height: depth }, shape)

  boardGeom = translate([0, 0, -depth / 2], boardGeom)

  return boardGeom
}
