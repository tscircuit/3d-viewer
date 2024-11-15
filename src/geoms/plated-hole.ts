import type { PCBPlatedHole } from "@tscircuit/soup"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { cuboid, cylinder } from "@jscad/modeling/src/primitives"
import { colorize } from "@jscad/modeling/src/colors"
import { subtract, union } from "@jscad/modeling/src/operations/booleans"
import { M, colors } from "./constants"
import type { GeomContext } from "../GeomContext"

export const platedHole = (
  plated_hole: PCBPlatedHole,
  ctx: GeomContext
): Geom3 => {
  if (!(plated_hole as PCBPlatedHole).shape) plated_hole.shape = "circle"
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
  }  if (plated_hole.shape === "pill") {
    const holeWidth = plated_hole.hole_width
    const holeHeight = plated_hole.hole_height
    const outerWidth = plated_hole.outer_width || holeWidth + 0.2
    const outerHeight = plated_hole.outer_height || holeHeight + 0.2
    const holeRadius = holeHeight / 2
    const outerRadius = outerHeight / 2

    // Create inner hole pill shape
    const mainRect = cuboid({
      center: [plated_hole.x, plated_hole.y, 0],
      size: [holeWidth - holeHeight, holeHeight, 1.2]
    })
    
    const leftCap = cylinder({
      center: [plated_hole.x - (holeWidth - holeHeight)/2, plated_hole.y, 0],
      radius: holeRadius,
      height: 1.2
    })

    const rightCap = cylinder({
      center: [plated_hole.x + (holeWidth - holeHeight)/2, plated_hole.y, 0],
      radius: holeRadius,
      height: 1.2
    })

    // Create outer pads
    const outerMainRect = cuboid({
      center: [plated_hole.x, plated_hole.y, 1.2/2],
      size: [outerWidth - outerHeight, outerHeight, M]
    })

    const outerLeftCap = cylinder({
      center: [plated_hole.x - (outerWidth - outerHeight)/2, plated_hole.y, 1.2/2],
      radius: outerRadius,
      height: M
    })

    const outerRightCap = cylinder({
      center: [plated_hole.x + (outerWidth - outerHeight)/2, plated_hole.y, 1.2/2],
      radius: outerRadius,
      height: M
    })

    // Bottom pads
    const bottomMainRect = cuboid({
      center: [plated_hole.x, plated_hole.y, -1.2/2],
      size: [outerWidth - outerHeight, outerHeight, M]
    })

    const bottomLeftCap = cylinder({
      center: [plated_hole.x - (outerWidth - outerHeight)/2, plated_hole.y, -1.2/2],
      radius: outerRadius,
      height: M
    })

    const bottomRightCap = cylinder({
      center: [plated_hole.x + (outerWidth - outerHeight)/2, plated_hole.y, -1.2/2],
      radius: outerRadius,
      height: M
    })

    return colorize(
      colors.copper,
      subtract(
        union(
          mainRect, leftCap, rightCap,
          outerMainRect, outerLeftCap, outerRightCap,
          bottomMainRect, bottomLeftCap, bottomRightCap
        ),[
          cuboid({
            center: [plated_hole.x, plated_hole.y, 0],
            size: [holeWidth - holeHeight - M*2, holeHeight - M*2, 1.5]
          }),
          cylinder({
            center: [plated_hole.x - (holeWidth - holeHeight)/2, plated_hole.y, 0],
            radius: holeRadius - M,
            height: 1.5
          }),
          cylinder({
            center: [plated_hole.x + (holeWidth - holeHeight)/2, plated_hole.y, 0],
            radius: holeRadius - M,
            height: 1.5
          })
        ]
      )
    )
  // biome-ignore lint/style/noUselessElse: <explanation>
  } else {
    throw new Error(`Unsupported plated hole shape: ${plated_hole.shape}`)
  }
}