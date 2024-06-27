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
  circle,
} from "@jscad/modeling/src/primitives"
import { colorize } from "@jscad/modeling/src/colors"
import { subtract, union } from "@jscad/modeling/src/operations/booleans"
import { platedHole } from "../geoms/plated-hole"
import { M, colors } from "../geoms/constants"

export const soupToJscadShape = (soup: AnySoupElement[]): Geom3[] => {
  const board = su(soup).pcb_board.list()[0]
  if (!board) {
    throw new Error("No pcb_board found")
  }

  const plated_holes = su(soup).pcb_plated_hole.list()
  const pads = su(soup).pcb_smtpad.list()

  // PCB Board
  let boardGeom = cuboid({ size: [board.width, board.height, 1.2] })

  const platedHoleGeoms: Geom3[] = []
  const padGeoms: Geom3[] = []
  const ctx = {
    pcbThickness: 1.2,
  }

  for (const plated_hole of plated_holes) {
    if (plated_hole.shape === "circle" || !plated_hole.shape) {
      const cyGeom = cylinder({
        center: [plated_hole.x, plated_hole.y, 0],
        radius: plated_hole.hole_diameter / 2 + M,
      })
      boardGeom = subtract(boardGeom, cyGeom)

      const platedHoleGeom = platedHole(plated_hole, ctx)
      platedHoleGeoms.push(platedHoleGeom)
    }
  }

  for (const pad of pads) {
    if (pad.shape === "rect") {
      const padGeom = colorize(
        colors.copper,
        cuboid({
          center: [pad.x, pad.y, 1.2 / 2 + M],
          size: [pad.width, pad.height, M],
        })
      )
      padGeoms.push(padGeom)
    } else if (pad.shape === "circle") {
      const padGeom = colorize(
        colors.copper,
        cylinder({
          center: [pad.x, pad.y, 1.2 / 2 + M],
          radius: pad.radius,
          height: M,
        })
      )
      padGeoms.push(padGeom)
    }
  }

  // Colorize to a PCB green color: #05A32E
  boardGeom = colorize(colors.fr4Green, boardGeom)

  return [boardGeom, ...platedHoleGeoms, ...padGeoms]
}
