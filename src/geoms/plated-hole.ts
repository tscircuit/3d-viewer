import type { PCBPlatedHole } from "circuit-json"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import {
  cuboid,
  cylinder,
  roundedRectangle,
} from "@jscad/modeling/src/primitives"
import { colorize } from "@jscad/modeling/src/colors"
import { subtract, union } from "@jscad/modeling/src/operations/booleans"
import { M, colors } from "./constants"
import type { GeomContext } from "../GeomContext"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { translate } from "@jscad/modeling/src/operations/transforms"
import {
  clampRectBorderRadius,
  extractRectBorderRadius,
} from "../utils/rect-border-radius"

const platedHoleLipHeight = 0.05
const RECT_PAD_SEGMENTS = 64

const createRectPadGeom = ({
  width,
  height,
  thickness,
  center,
  borderRadius,
}: {
  width: number
  height: number
  thickness: number
  center: [number, number, number]
  borderRadius?: number | null
}) => {
  const clampedRadius = clampRectBorderRadius(width, height, borderRadius)

  if (clampedRadius <= 0) {
    return cuboid({ center, size: [width, height, thickness] })
  }

  const rect2d = roundedRectangle({
    size: [width, height],
    roundRadius: clampedRadius,
    segments: RECT_PAD_SEGMENTS,
  })
  const extruded = extrudeLinear({ height: thickness }, rect2d)
  const offsetZ = center[2] - thickness / 2
  return translate([center[0], center[1], offsetZ], extruded)
}

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
            height: ctx.pcbThickness,
          }),
          cylinder({
            center: [
              plated_hole.x,
              plated_hole.y,
              ctx.pcbThickness / 2 + platedHoleLipHeight / 2 + M,
            ],
            radius: plated_hole.outer_diameter / 2,
            height: platedHoleLipHeight,
          }),
          cylinder({
            center: [
              plated_hole.x,
              plated_hole.y,
              -ctx.pcbThickness / 2 - platedHoleLipHeight / 2 - M,
            ],
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
    const rectBorderRadius = extractRectBorderRadius(plated_hole)

    return colorize(
      colors.copper,
      subtract(
        union(
          // Top rectangular pad
          createRectPadGeom({
            width: padWidth,
            height: padHeight,
            thickness: platedHoleLipHeight,
            center: [plated_hole.x, plated_hole.y, 1.2 / 2],
            borderRadius: rectBorderRadius,
          }),
          // Bottom rectangular pad
          createRectPadGeom({
            width: padWidth,
            height: padHeight,
            thickness: platedHoleLipHeight,
            center: [plated_hole.x, plated_hole.y, -1.2 / 2],
            borderRadius: rectBorderRadius,
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
    const outerPillWidth = shouldRotate
      ? plated_hole.outer_height || holeHeight + 0.2
      : plated_hole.outer_width || holeWidth + 0.2
    const outerPillHeight = shouldRotate
      ? plated_hole.outer_width || holeWidth + 0.2
      : plated_hole.outer_height || holeHeight + 0.2

    const holeRadius = holeHeight / 2
    const outerRadius = outerPillHeight / 2
    const rectLength = Math.abs(holeWidth - holeHeight)
    const outerRectLength = Math.abs(outerPillWidth - outerPillHeight)

    const mainRectBarrel = cuboid({
      center: [plated_hole.x, plated_hole.y, 0],
      size: shouldRotate
        ? [holeHeight, rectLength, ctx.pcbThickness]
        : [rectLength, holeHeight, ctx.pcbThickness],
    })
    const leftCapBarrel = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y - rectLength / 2, 0]
        : [plated_hole.x - rectLength / 2, plated_hole.y, 0],
      radius: holeRadius,
      height: ctx.pcbThickness,
    })
    const rightCapBarrel = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y + rectLength / 2, 0]
        : [plated_hole.x + rectLength / 2, plated_hole.y, 0],
      radius: holeRadius,
      height: ctx.pcbThickness,
    })
    const barrelUnion = union(mainRectBarrel, leftCapBarrel, rightCapBarrel)

    const topLipZ = ctx.pcbThickness / 2 + platedHoleLipHeight / 2 + M
    const topLipRect = cuboid({
      center: [plated_hole.x, plated_hole.y, topLipZ],
      size: shouldRotate
        ? [outerPillHeight, outerRectLength, platedHoleLipHeight]
        : [outerRectLength, outerPillHeight, platedHoleLipHeight],
    })
    const topLipLeftCap = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y - outerRectLength / 2, topLipZ]
        : [plated_hole.x - outerRectLength / 2, plated_hole.y, topLipZ],
      radius: outerRadius,
      height: platedHoleLipHeight,
    })
    const topLipRightCap = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y + outerRectLength / 2, topLipZ]
        : [plated_hole.x + outerRectLength / 2, plated_hole.y, topLipZ],
      radius: outerRadius,
      height: platedHoleLipHeight,
    })
    const topLipUnion = union(topLipRect, topLipLeftCap, topLipRightCap)

    const bottomLipZ = -ctx.pcbThickness / 2 - platedHoleLipHeight / 2 - M
    const bottomLipRect = cuboid({
      center: [plated_hole.x, plated_hole.y, bottomLipZ],
      size: shouldRotate
        ? [outerPillHeight, outerRectLength, platedHoleLipHeight]
        : [outerRectLength, outerPillHeight, platedHoleLipHeight],
    })
    const bottomLipLeftCap = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y - outerRectLength / 2, bottomLipZ]
        : [plated_hole.x - outerRectLength / 2, plated_hole.y, bottomLipZ],
      radius: outerRadius,
      height: platedHoleLipHeight,
    })
    const bottomLipRightCap = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y + outerRectLength / 2, bottomLipZ]
        : [plated_hole.x + outerRectLength / 2, plated_hole.y, bottomLipZ],
      radius: outerRadius,
      height: platedHoleLipHeight,
    })
    const bottomLipUnion = union(
      bottomLipRect,
      bottomLipLeftCap,
      bottomLipRightCap,
    )

    const drillRect = cuboid({
      center: [plated_hole.x, plated_hole.y, 0],
      size: shouldRotate
        ? [holeHeight - 2 * M, rectLength, ctx.pcbThickness + 2 * M]
        : [rectLength, holeHeight - 2 * M, ctx.pcbThickness + 2 * M],
    })
    const drillLeftCap = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y - rectLength / 2, 0]
        : [plated_hole.x - rectLength / 2, plated_hole.y, 0],
      radius: holeRadius - M,
      height: ctx.pcbThickness + 2 * M,
    })
    const drillRightCap = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y + rectLength / 2, 0]
        : [plated_hole.x + rectLength / 2, plated_hole.y, 0],
      radius: holeRadius - M,
      height: ctx.pcbThickness + 2 * M,
    })
    const drillUnion = union(drillRect, drillLeftCap, drillRightCap)

    return colorize(
      colors.copper,
      subtract(union(barrelUnion, topLipUnion, bottomLipUnion), drillUnion),
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
    const rectBorderRadius = extractRectBorderRadius(plated_hole)

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

    const topPad = createRectPadGeom({
      width: padWidth,
      height: padHeight,
      thickness: platedHoleLipHeight,
      center: [plated_hole.x, plated_hole.y, 1.2 / 2],
      borderRadius: rectBorderRadius,
    })

    const bottomPad = createRectPadGeom({
      width: padWidth,
      height: padHeight,
      thickness: platedHoleLipHeight,
      center: [plated_hole.x, plated_hole.y, -1.2 / 2],
      borderRadius: rectBorderRadius,
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
