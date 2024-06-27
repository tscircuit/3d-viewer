import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type { AnySoupElement } from "@tscircuit/soup"
import { su } from "@tscircuit/soup-util"
import { scale, translate } from "@jscad/modeling/src/operations/transforms"
import {
  cube,
  sphere,
  rectangle,
  cuboid,
  cylinder,
} from "@jscad/modeling/src/primitives"
import { colorize } from "@jscad/modeling/src/colors"
import { subtract, union } from "@jscad/modeling/src/operations/booleans"

const M = 0.05

export const soupToJscadShape = (soup: AnySoupElement[]): Geom3[] => {
  const board = su(soup).pcb_board.list()[0]
  if (!board) {
    throw new Error("No pcb_board found")
  }

  const plated_holes = su(soup).pcb_plated_hole.list()

  // PCB Board
  let boardGeom = cuboid({ size: [board.width, board.height, 1.2] })

  const platedHoleGeoms: Geom3[] = []

  for (const plated_hole of plated_holes) {
    if (plated_hole.shape === "circle" || !plated_hole.shape) {
      const cyGeom = cylinder({
        center: [plated_hole.x, plated_hole.y, 0],
        radius: plated_hole.hole_diameter / 2 + M,
      })
      boardGeom = subtract(boardGeom, cyGeom)

      // We need to create a plated hole geometry and insert it into the board
      // hole

      // TODO cache this geometry
      const platedHoleGeom = colorize(
        [0.9, 0.6, 0.2],
        subtract(
          union(
            cylinder({
              center: [plated_hole.x, plated_hole.y, 0],
              radius: plated_hole.hole_diameter / 2,
              height: 1.2,
            }),
            cylinder({
              center: [plated_hole.x, plated_hole.y, 1.2 / 2],
              radius: plated_hole.outer_diameter / 2,
              height: M,
            }),
            cylinder({
              center: [plated_hole.x, plated_hole.y, -1.2 / 2],
              radius: plated_hole.outer_diameter / 2,
              height: M,
            })
          ),
          cylinder({
            center: [plated_hole.x, plated_hole.y, 0],
            radius: plated_hole.hole_diameter / 2 - M,
            height: 1.5,
          })
        )
      )
      platedHoleGeoms.push(platedHoleGeom)

      // const hole = sphere({ radius: / 2 })
      // const hole_position = translate([plated_hole.x, plated_hole.y, 0], hole)
      // shape = shape.union(hole_position)
    }
  }

  // Colorize to a PCB green color: #05A32E
  boardGeom = colorize([0x05 / 255, 0xa3 / 255, 0x2e / 255], boardGeom)

  return [boardGeom, ...platedHoleGeoms]
}
