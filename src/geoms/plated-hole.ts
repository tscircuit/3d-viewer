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
          height: ctx.pcbThickness + M * 2,
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
  } else {
    throw new Error(`Unsupported plated hole shape: ${plated_hole.shape}`)
  }
}
