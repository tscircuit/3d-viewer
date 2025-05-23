import type { PCBPlatedHole } from "circuit-json"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { cuboid, cylinder } from "@jscad/modeling/src/primitives"
import { colorize } from "@jscad/modeling/src/colors"
import { subtract, union } from "@jscad/modeling/src/operations/booleans"
import { M, colors } from "./constants"
import type { GeomContext } from "../GeomContext"

const platedHoleLipHeight = 0.05

export const platedHole = (
  plated_hole: PCBPlatedHole,
  ctx: GeomContext,
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
            height: platedHoleLipHeight,
          }),
          cylinder({
            center: [plated_hole.x, plated_hole.y, -1.2 / 2],
            radius: plated_hole.outer_diameter / 2,
            height: platedHoleLipHeight,
          }),
        ),
        cylinder({
          center: [plated_hole.x, plated_hole.y, 0],
          radius: plated_hole.hole_diameter / 2 - M,
          height: 1.5,
        }),
      ),
    )
  }
  if (plated_hole.shape === "circular_hole_with_rect_pad") {
    const padWidth = plated_hole.rect_pad_width || plated_hole.hole_diameter
    const padHeight = plated_hole.rect_pad_height || plated_hole.hole_diameter

    return colorize(
      colors.copper,
      subtract(
        union(
          // Top rectangular pad
          cuboid({
            center: [plated_hole.x, plated_hole.y, 1.2 / 2],
            size: [padWidth, padHeight, platedHoleLipHeight],
          }),
          // Bottom rectangular pad
          cuboid({
            center: [plated_hole.x, plated_hole.y, -1.2 / 2],
            size: [padWidth, padHeight, platedHoleLipHeight],
          }),
          // Plated barrel around hole
          cylinder({
            center: [plated_hole.x, plated_hole.y, 0],
            radius: plated_hole.hole_diameter / 2,
            height: 1.2,
          }),
        ),
        // Subtract actual hole through
        cylinder({
          center: [plated_hole.x, plated_hole.y, 0],
          radius: Math.max(plated_hole.hole_diameter / 2 - M, 0.01),
          height: 1.5,
        }),
      ),
    )
  }

  if (plated_hole.shape === "pill") {
    const shouldRotate = plated_hole.hole_height! > plated_hole.hole_width!

    const holeWidth = shouldRotate
      ? plated_hole.hole_height!
      : plated_hole.hole_width!
    const holeHeight = shouldRotate
      ? plated_hole.hole_width!
      : plated_hole.hole_height!
    const outerHeight = shouldRotate
      ? plated_hole.outer_width || holeWidth + 0.2
      : plated_hole.outer_height || holeHeight + 0.2

    const holeRadius = holeHeight / 2
    const rectLength = Math.abs(holeWidth - holeHeight)

    const mainRect = cuboid({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y, 0]
        : [plated_hole.x, plated_hole.y, 0],
      size: shouldRotate
        ? [holeHeight, rectLength, 1.2]
        : [rectLength, holeHeight, 1.2],
    })

    const leftCap = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y - rectLength / 2, 0]
        : [plated_hole.x - rectLength / 2, plated_hole.y, 0],
      radius: holeRadius,
      height: 1.2,
    })

    const rightCap = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y + rectLength / 2, 0]
        : [plated_hole.x + rectLength / 2, plated_hole.y, 0],
      radius: holeRadius,
      height: 1.2,
    })

    const outerMainRect = cuboid({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y, 1.2 / 2]
        : [plated_hole.x, plated_hole.y, 1.2 / 2],
      size: shouldRotate
        ? [outerHeight, rectLength, M]
        : [rectLength, outerHeight, M],
    })

    const outerLeftCap = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y - rectLength / 2, 1.2 / 2]
        : [plated_hole.x - rectLength / 2, plated_hole.y, 1.2 / 2],
      radius: outerHeight / 2,
      height: platedHoleLipHeight,
    })

    const outerRightCap = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y + rectLength / 2, 1.2 / 2]
        : [plated_hole.x + rectLength / 2, plated_hole.y, 1.2 / 2],
      radius: outerHeight / 2,
      height: platedHoleLipHeight,
    })

    const bottomMainRect = cuboid({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y, -1.2 / 2]
        : [plated_hole.x, plated_hole.y, -1.2 / 2],
      size: shouldRotate
        ? [outerHeight, rectLength, M]
        : [rectLength, outerHeight, M],
    })

    const bottomLeftCap = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y - rectLength / 2, -1.2 / 2]
        : [plated_hole.x - rectLength / 2, plated_hole.y, -1.2 / 2],
      radius: outerHeight / 2,
      height: platedHoleLipHeight,
    })

    const bottomRightCap = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y + rectLength / 2, -1.2 / 2]
        : [plated_hole.x + rectLength / 2, plated_hole.y, -1.2 / 2],
      radius: outerHeight / 2,
      height: platedHoleLipHeight,
    })
    return colorize(
      colors.copper,
      subtract(
        union(
          mainRect,
          leftCap,
          rightCap,
          outerMainRect,
          outerLeftCap,
          outerRightCap,
          bottomMainRect,
          bottomLeftCap,
          bottomRightCap,
        ),
        union(
          cuboid({
            center: [plated_hole.x, plated_hole.y, 0],
            size: shouldRotate
              ? [holeHeight - platedHoleLipHeight, rectLength, 1.5]
              : [rectLength, holeHeight - platedHoleLipHeight, 1.5],
          }),
          cylinder({
            center: shouldRotate
              ? [plated_hole.x, plated_hole.y - rectLength / 2, 0]
              : [plated_hole.x - rectLength / 2, plated_hole.y, 0],
            radius: holeRadius - platedHoleLipHeight,
            height: 1.5,
          }),
          cylinder({
            center: shouldRotate
              ? [plated_hole.x, plated_hole.y + rectLength / 2, 0]
              : [plated_hole.x + rectLength / 2, plated_hole.y, 0],
            radius: holeRadius - platedHoleLipHeight,
            height: 1.5,
          }),
        ),
      ),
    )
    // biome-ignore lint/style/noUselessElse: <explanation>
  }
  if (plated_hole.shape === "pill_hole_with_rect_pad") {
    const shouldRotate = plated_hole.hole_height! > plated_hole.hole_width!
    const holeWidth = shouldRotate
      ? plated_hole.hole_height!
      : plated_hole.hole_width!
    const holeHeight = shouldRotate
      ? plated_hole.hole_width!
      : plated_hole.hole_height!
    const holeRadius = holeHeight / 2
    const rectLength = Math.abs(holeWidth - holeHeight)

    const padWidth = plated_hole.rect_pad_width || holeWidth + 0.2
    const padHeight = plated_hole.rect_pad_height || holeHeight + 0.2

    const mainRect = cuboid({
      center: [plated_hole.x, plated_hole.y, 0],
      size: shouldRotate
        ? [holeHeight, rectLength, 1.2]
        : [rectLength, holeHeight, 1.2],
    })

    const leftCap = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y - rectLength / 2, 0]
        : [plated_hole.x - rectLength / 2, plated_hole.y, 0],
      radius: holeRadius,
      height: 1.2,
    })

    const rightCap = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y + rectLength / 2, 0]
        : [plated_hole.x + rectLength / 2, plated_hole.y, 0],
      radius: holeRadius,
      height: 1.2,
    })

    const topPad = cuboid({
      center: [plated_hole.x, plated_hole.y, 1.2 / 2],
      size: [padWidth, padHeight, platedHoleLipHeight],
    })

    const bottomPad = cuboid({
      center: [plated_hole.x, plated_hole.y, -1.2 / 2],
      size: [padWidth, padHeight, platedHoleLipHeight],
    })

    const holeCut = union(
      cuboid({
        center: [plated_hole.x, plated_hole.y, 0],
        size: shouldRotate
          ? [holeHeight - platedHoleLipHeight, rectLength, 1.5]
          : [rectLength, holeHeight - platedHoleLipHeight, 1.5],
      }),
      cylinder({
        center: shouldRotate
          ? [plated_hole.x, plated_hole.y - rectLength / 2, 0]
          : [plated_hole.x - rectLength / 2, plated_hole.y, 0],
        radius: holeRadius - platedHoleLipHeight,
        height: 1.5,
      }),
      cylinder({
        center: shouldRotate
          ? [plated_hole.x, plated_hole.y + rectLength / 2, 0]
          : [plated_hole.x + rectLength / 2, plated_hole.y, 0],
        radius: holeRadius - platedHoleLipHeight,
        height: 1.5,
      }),
    )

    return colorize(
      colors.copper,
      subtract(union(mainRect, leftCap, rightCap, topPad, bottomPad), holeCut),
    )
  } else {
    throw new Error(`Unsupported plated hole shape: ${plated_hole.shape}`)
  }
}
