import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { polygon } from "@jscad/modeling/src/primitives"
import type { Geom2, Geom3 } from "@jscad/modeling/src/geometries/types"
import type { Vec2 } from "@jscad/modeling/src/maths/types"
import type { Point } from "@tscircuit/soup"
import { translate } from "@jscad/modeling/src/operations/transforms"

const arePointsClockwise = (points: Vec2[]): boolean => {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i]![0] * points[j]![1]
    area -= points[j]![0] * points[i]![1]
  }
  const signedArea = area / 2
  return signedArea <= 0
}

export const createBoardWithOutline = (points: Point[], depth = 1.2): Geom3 => {
  let outline: Vec2[] = points.map((point) => [point.x, point.y])

  if (arePointsClockwise(outline)) {
    outline = outline.reverse()
  }

  const shape: Geom2 = polygon({ points: outline })

  let board: Geom3 = extrudeLinear({ height: depth }, shape)

  board = translate([0, 0, -depth / 2], board)

  return board
}
