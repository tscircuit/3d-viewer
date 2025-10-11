import type { PCBPlatedHole } from "circuit-json"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import {
  cuboid,
  cylinder,
  roundedRectangle,
} from "@jscad/modeling/src/primitives"
import { colorize } from "@jscad/modeling/src/colors"
import {
  intersect,
  subtract,
  union,
} from "@jscad/modeling/src/operations/booleans"
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

const maybeClip = (geom: Geom3, clipGeom?: Geom3 | null) =>
  clipGeom ? intersect(clipGeom, geom) : geom

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

type PlatedHoleOptions = {
  clipGeom?: Geom3 | null
}

export const platedHole = (
  plated_hole: PCBPlatedHole,
  ctx: GeomContext,
  options: PlatedHoleOptions = {},
): Geom3 => {
  const { clipGeom } = options
  if (!(plated_hole as PCBPlatedHole).shape) plated_hole.shape = "circle"
  const throughDrillHeight = ctx.pcbThickness + 2 * platedHoleLipHeight + 4 * M
  if (plated_hole.shape === "circle") {
    const outerDiameter =
      plated_hole.outer_diameter ?? Math.max(plated_hole.hole_diameter, 0)
    const copperHeight = ctx.pcbThickness + 2 * (platedHoleLipHeight + M)
    const copperBody = cylinder({
      center: [plated_hole.x, plated_hole.y, 0],
      radius: outerDiameter / 2,
      height: copperHeight,
    })

    const copperSolid = maybeClip(copperBody, clipGeom)

    const drill = cylinder({
      center: [plated_hole.x, plated_hole.y, 0],
      radius: Math.max(plated_hole.hole_diameter / 2, 0.01),
      height: throughDrillHeight,
    })

    return colorize(colors.copper, subtract(copperSolid, drill))
  }
  if (plated_hole.shape === "circular_hole_with_rect_pad") {
    const padWidth = plated_hole.rect_pad_width || plated_hole.hole_diameter
    const padHeight = plated_hole.rect_pad_height || plated_hole.hole_diameter
    const rectBorderRadius = extractRectBorderRadius(plated_hole)

    const copperSolid = maybeClip(
      union(
        // Top rectangular pad
        createRectPadGeom({
          width: padWidth,
          height: padHeight,
          thickness: platedHoleLipHeight,
          center: [
            plated_hole.x,
            plated_hole.y,
            ctx.pcbThickness / 2 + platedHoleLipHeight / 2 + M,
          ],
          borderRadius: rectBorderRadius,
        }),
        // Bottom rectangular pad
        createRectPadGeom({
          width: padWidth,
          height: padHeight,
          thickness: platedHoleLipHeight,
          center: [
            plated_hole.x,
            plated_hole.y,
            -ctx.pcbThickness / 2 - platedHoleLipHeight / 2 - M,
          ],
          borderRadius: rectBorderRadius,
        }),
        // Plated barrel around hole
        cylinder({
          center: [plated_hole.x, plated_hole.y, 0],
          radius: plated_hole.hole_diameter / 2,
          height: ctx.pcbThickness,
        }),
      ),
      clipGeom,
    )

    const drill = cylinder({
      center: [plated_hole.x, plated_hole.y, 0],
      radius: Math.max(plated_hole.hole_diameter / 2 - M, 0.01),
      height: throughDrillHeight,
    })

    return colorize(colors.copper, subtract(copperSolid, drill))
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
    const copperHeight = ctx.pcbThickness + 2 * (platedHoleLipHeight + M)

    const createPillSection = (
      width: number,
      height: number,
      thickness: number,
    ) => {
      const radius = height / 2
      const length = Math.abs(width - height)

      if (length <= 1e-6) {
        return cylinder({
          center: [plated_hole.x, plated_hole.y, 0],
          radius,
          height: thickness,
        })
      }

      const rect = cuboid({
        center: [plated_hole.x, plated_hole.y, 0],
        size: shouldRotate
          ? [height, length, thickness]
          : [length, height, thickness],
      })

      const leftCap = cylinder({
        center: shouldRotate
          ? [plated_hole.x, plated_hole.y - length / 2, 0]
          : [plated_hole.x - length / 2, plated_hole.y, 0],
        radius,
        height: thickness,
      })

      const rightCap = cylinder({
        center: shouldRotate
          ? [plated_hole.x, plated_hole.y + length / 2, 0]
          : [plated_hole.x + length / 2, plated_hole.y, 0],
        radius,
        height: thickness,
      })

      return union(rect, leftCap, rightCap)
    }

    const outerBarrel = createPillSection(
      outerPillWidth,
      outerPillHeight,
      copperHeight,
    )

    const drillRect = cuboid({
      center: [plated_hole.x, plated_hole.y, 0],
      size: shouldRotate
        ? [holeHeight - 2 * M, rectLength, throughDrillHeight]
        : [rectLength, holeHeight - 2 * M, throughDrillHeight],
    })
    const drillLeftCap = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y - rectLength / 2, 0]
        : [plated_hole.x - rectLength / 2, plated_hole.y, 0],
      radius: holeRadius - M,
      height: throughDrillHeight,
    })
    const drillRightCap = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y + rectLength / 2, 0]
        : [plated_hole.x + rectLength / 2, plated_hole.y, 0],
      radius: holeRadius - M,
      height: throughDrillHeight,
    })
    const drillUnion = union(drillRect, drillLeftCap, drillRightCap)

    const copperSolid = maybeClip(outerBarrel, clipGeom)
    const drill = drillUnion

    return colorize(colors.copper, subtract(copperSolid, drill))
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
        ? [holeHeight, rectLength, ctx.pcbThickness]
        : [rectLength, holeHeight, ctx.pcbThickness],
    })

    const leftCap = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y - rectLength / 2, 0]
        : [plated_hole.x - rectLength / 2, plated_hole.y, 0],
      radius: holeRadius,
      height: ctx.pcbThickness,
    })

    const rightCap = cylinder({
      center: shouldRotate
        ? [plated_hole.x, plated_hole.y + rectLength / 2, 0]
        : [plated_hole.x + rectLength / 2, plated_hole.y, 0],
      radius: holeRadius,
      height: ctx.pcbThickness,
    })

    const topPad = createRectPadGeom({
      width: padWidth,
      height: padHeight,
      thickness: platedHoleLipHeight,
      center: [
        plated_hole.x,
        plated_hole.y,
        ctx.pcbThickness / 2 + platedHoleLipHeight / 2 + M,
      ],
      borderRadius: rectBorderRadius,
    })

    const bottomPad = createRectPadGeom({
      width: padWidth,
      height: padHeight,
      thickness: platedHoleLipHeight,
      center: [
        plated_hole.x,
        plated_hole.y,
        -ctx.pcbThickness / 2 - platedHoleLipHeight / 2 - M,
      ],
      borderRadius: rectBorderRadius,
    })

    const holeCut = union(
      cuboid({
        center: [plated_hole.x, plated_hole.y, 0],
        size: shouldRotate
          ? [holeHeight - platedHoleLipHeight, rectLength, throughDrillHeight]
          : [rectLength, holeHeight - platedHoleLipHeight, throughDrillHeight],
      }),
      cylinder({
        center: shouldRotate
          ? [plated_hole.x, plated_hole.y - rectLength / 2, 0]
          : [plated_hole.x - rectLength / 2, plated_hole.y, 0],
        radius: holeRadius - platedHoleLipHeight,
        height: throughDrillHeight,
      }),
      cylinder({
        center: shouldRotate
          ? [plated_hole.x, plated_hole.y + rectLength / 2, 0]
          : [plated_hole.x + rectLength / 2, plated_hole.y, 0],
        radius: holeRadius - platedHoleLipHeight,
        height: throughDrillHeight,
      }),
    )

    const copperSolid = maybeClip(
      union(mainRect, leftCap, rightCap, topPad, bottomPad),
      clipGeom,
    )
    const drill = holeCut

    return colorize(colors.copper, subtract(copperSolid, drill))
  } else {
    throw new Error(`Unsupported plated hole shape: ${plated_hole.shape}`)
  }
}
