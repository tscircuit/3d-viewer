import type { PCBPlatedHole } from "@tscircuit/soup"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { cylinder } from "@jscad/modeling/src/primitives"
import { colorize } from "@jscad/modeling/src/colors"
import { subtract, union } from "@jscad/modeling/src/operations/booleans"
import { M, colors } from "./constants"
import { GeomContext } from "../GeomContext"

export const platedHole = (
  plated_hole: PCBPlatedHole,
  ctx: GeomContext
): Geom3 => {
  if (!(plated_hole as any).shape) plated_hole.shape = "circle"
  if (plated_hole.shape === "circle") {
    return colorize(
      colors.copper,
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
  } else {
    throw new Error(`Unsupported plated hole shape: ${plated_hole.shape}`)
  }
}
