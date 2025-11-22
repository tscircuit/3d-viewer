import type { PCBPlatedHole } from "circuit-json"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import {
  cuboid,
  cylinder,
  roundedRectangle,
  polygon as jscadPolygon,
} from "@jscad/modeling/src/primitives"
import { colorize } from "@jscad/modeling/src/colors"
import {
  intersect,
  subtract,
  union,
} from "@jscad/modeling/src/operations/booleans"
import { BOARD_SURFACE_OFFSET, M, colors } from "./constants"
import type { GeomContext } from "../GeomContext"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import {
  rotateZ,
  translate,
  rotate,
} from "@jscad/modeling/src/operations/transforms"
import {
  clampRectBorderRadius,
  extractRectBorderRadius,
} from "../utils/rect-border-radius"
import { createHoleWithPolygonPadHoleGeom } from "./create-hole-with-polygon-pad"

const platedHoleLipHeight = 0.02
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
  const topSurfaceZ = ctx.pcbThickness / 2 + BOARD_SURFACE_OFFSET.copper
  const bottomSurfaceZ = -ctx.pcbThickness / 2 - BOARD_SURFACE_OFFSET.copper
  const copperSpan = topSurfaceZ - bottomSurfaceZ
  if (plated_hole.shape === "circle") {
    const outerDiameter =
      plated_hole.outer_diameter ?? Math.max(plated_hole.hole_diameter, 0)
    const copperHeight = copperSpan + 0.01
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
    const holeOffsetX = plated_hole.hole_offset_x || 0
    const holeOffsetY = plated_hole.hole_offset_y || 0
    const padWidth = plated_hole.rect_pad_width || plated_hole.hole_diameter
    const padHeight = plated_hole.rect_pad_height || plated_hole.hole_diameter
    const rectBorderRadius = extractRectBorderRadius(plated_hole)
    // Create a solid copper shape that connects the top and bottom pads
    const copperSolid = maybeClip(
      union(
        // Top rectangular pad (thicker to ensure connection)
        createRectPadGeom({
          width: padWidth,
          height: padHeight,
          thickness: platedHoleLipHeight, // Slightly thicker to ensure connection
          center: [plated_hole.x, plated_hole.y, topSurfaceZ],
          borderRadius: rectBorderRadius,
        }),
        // Bottom rectangular pad (thicker to ensure connection)
        createRectPadGeom({
          width: padWidth,
          height: padHeight,
          thickness: platedHoleLipHeight, // Slightly thicker to ensure connection
          center: [plated_hole.x, plated_hole.y, bottomSurfaceZ],
          borderRadius: rectBorderRadius,
        }),
        // Main copper fill between pads with rounded corners
        (() => {
          const height = Math.max(copperSpan - platedHoleLipHeight * 2, M)
          const topPadBottom = topSurfaceZ
          const bottomPadTop = bottomSurfaceZ
          const centerZ = (topPadBottom + bottomPadTop) / 2
          const rect2d = roundedRectangle({
            size: [padWidth, padHeight],
            roundRadius: rectBorderRadius || 0,
            segments: RECT_PAD_SEGMENTS,
          })
          const extruded = extrudeLinear({ height }, rect2d)
          return translate(
            [plated_hole.x, plated_hole.y, centerZ - height / 2],
            extruded,
          )
        })(),
        // Plated barrel around hole (ensured connection with pads)
        cylinder({
          center: [
            plated_hole.x + (holeOffsetX || 0),
            plated_hole.y + (holeOffsetY || 0),
            0,
          ],
          radius: plated_hole.hole_diameter / 2,
          height: copperSpan,
        }),
      ),
      clipGeom,
    )

    const drill = cylinder({
      center: [
        plated_hole.x + (holeOffsetX || 0),
        plated_hole.y + (holeOffsetY || 0),
        0,
      ],
      radius: Math.max(plated_hole.hole_diameter / 2 - M, 0.01),
      height: throughDrillHeight,
    })

    // Create the barrel with offset
    const barrel = cylinder({
      center: [
        plated_hole.x + (holeOffsetX || 0),
        plated_hole.y + (holeOffsetY || 0),
        0,
      ],
      radius: plated_hole.hole_diameter / 2,
      height: copperSpan,
    })

    // Create the final copper solid with the offset barrel and hole
    let finalCopper = union(
      subtract(copperSolid, barrel), // Subtract the barrel from the main shape
      barrel, // Add the barrel back to ensure proper connection
    )

    // Apply clip geometry if provided to ensure we don't extend beyond board boundaries
    if (options.clipGeom) {
      // First, subtract the drill from the copper
      finalCopper = subtract(finalCopper, drill)

      // Then clip to the board boundaries
      finalCopper = intersect(finalCopper, options.clipGeom)

      return colorize(colors.copper, finalCopper)
    }

    return colorize(colors.copper, subtract(finalCopper, drill))
  }

  if (plated_hole.shape === "pill") {
    const rotationRadians = ((plated_hole.ccw_rotation || 0) * Math.PI) / 180
    const rotateAroundCenter = (geom: Geom3) => {
      if (!rotationRadians) return geom
      const toOrigin = translate([-plated_hole.x, -plated_hole.y, 0], geom)
      const rotated = rotate([0, 0, rotationRadians], toOrigin)
      return translate([plated_hole.x, plated_hole.y, 0], rotated)
    }
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
    const copperHeight = copperSpan + 0.01

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

    const copperSolid = maybeClip(rotateAroundCenter(outerBarrel), clipGeom)
    const drill = rotateAroundCenter(drillUnion)
    // const drill = drillUnion

    return colorize(colors.copper, subtract(copperSolid, drill))
    // biome-ignore lint/style/noUselessElse: <explanation>
  }
  if (plated_hole.shape === "pill_hole_with_rect_pad") {
    const holeOffsetX = plated_hole.hole_offset_x || 0
    const holeOffsetY = plated_hole.hole_offset_y || 0
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

    const barrelMargin = 0.03

    // --- Barrel ---
    const barrel = union(
      cuboid({
        center: [plated_hole.x + holeOffsetX, plated_hole.y + holeOffsetY, 0],
        size: shouldRotate
          ? [
              holeHeight + 2 * barrelMargin,
              rectLength + 2 * barrelMargin,
              copperSpan,
            ]
          : [
              rectLength + 2 * barrelMargin,
              holeHeight + 2 * barrelMargin,
              copperSpan,
            ],
      }),
      cylinder({
        center: shouldRotate
          ? [
              plated_hole.x + holeOffsetX,
              plated_hole.y + holeOffsetY - rectLength / 2,
              0,
            ]
          : [
              plated_hole.x + holeOffsetX - rectLength / 2,
              plated_hole.y + holeOffsetY,
              0,
            ],
        radius: holeRadius + barrelMargin,
        height: copperSpan,
      }),
      cylinder({
        center: shouldRotate
          ? [
              plated_hole.x + holeOffsetX,
              plated_hole.y + holeOffsetY + rectLength / 2,
              0,
            ]
          : [
              plated_hole.x + holeOffsetX + rectLength / 2,
              plated_hole.y + holeOffsetY,
              0,
            ],
        radius: holeRadius + barrelMargin,
        height: copperSpan,
      }),
    )

    // --- Hole cutout ---
    const holeCut = union(
      cuboid({
        center: [plated_hole.x + holeOffsetX, plated_hole.y + holeOffsetY, 0],
        size: shouldRotate
          ? [holeHeight, rectLength, throughDrillHeight * 1.1]
          : [rectLength, holeHeight, throughDrillHeight * 1.1],
      }),
      cylinder({
        center: shouldRotate
          ? [
              plated_hole.x + holeOffsetX,
              plated_hole.y + holeOffsetY - rectLength / 2,
              0,
            ]
          : [
              plated_hole.x + holeOffsetX - rectLength / 2,
              plated_hole.y + holeOffsetY,
              0,
            ],
        radius: holeRadius,
        height: throughDrillHeight * 1.1,
      }),
      cylinder({
        center: shouldRotate
          ? [
              plated_hole.x + holeOffsetX,
              plated_hole.y + holeOffsetY + rectLength / 2,
              0,
            ]
          : [
              plated_hole.x + holeOffsetX + rectLength / 2,
              plated_hole.y + holeOffsetY,
              0,
            ],
        radius: holeRadius,
        height: throughDrillHeight * 1.1,
      }),
    )

    // --- Pads and fill ---
    const copperTopPad = createRectPadGeom({
      width: padWidth,
      height: padHeight,
      thickness: platedHoleLipHeight,
      center: [plated_hole.x, plated_hole.y, topSurfaceZ],
      borderRadius: rectBorderRadius,
    })

    const copperBottomPad = createRectPadGeom({
      width: padWidth,
      height: padHeight,
      thickness: platedHoleLipHeight,
      center: [plated_hole.x, plated_hole.y, bottomSurfaceZ],
      borderRadius: rectBorderRadius,
    })

    const copperFill = (() => {
      const height = Math.max(copperSpan - platedHoleLipHeight * 2, M)
      const topPadBottom = topSurfaceZ
      const bottomPadTop = bottomSurfaceZ
      const centerZ = (topPadBottom + bottomPadTop) / 2
      const rect2d = roundedRectangle({
        size: [padWidth, padHeight],
        roundRadius: rectBorderRadius || 0,
        segments: RECT_PAD_SEGMENTS,
      })
      const extruded = extrudeLinear({ height }, rect2d)
      return translate(
        [plated_hole.x, plated_hole.y, centerZ - height / 2],
        extruded,
      )
    })()

    // --- Cut pads with the hole ---
    const copperTopPadCut = subtract(copperTopPad, holeCut)
    const copperBottomPadCut = subtract(copperBottomPad, holeCut)
    const copperFillCut = subtract(copperFill, holeCut)

    // --- Barrel internal cut (keeps thin copper rim) ---
    const barrelHoleCut = union(
      cuboid({
        center: [plated_hole.x + holeOffsetX, plated_hole.y + holeOffsetY, 0],
        size: shouldRotate
          ? [holeHeight - 2 * M, rectLength - 2 * M, throughDrillHeight * 1.1]
          : [rectLength - 2 * M, holeHeight - 2 * M, throughDrillHeight * 1.1],
      }),
      cylinder({
        center: shouldRotate
          ? [
              plated_hole.x + holeOffsetX,
              plated_hole.y + holeOffsetY - rectLength / 2,
              0,
            ]
          : [
              plated_hole.x + holeOffsetX - rectLength / 2,
              plated_hole.y + holeOffsetY,
              0,
            ],
        radius: holeRadius - M,
        height: throughDrillHeight * 1.1,
      }),
      cylinder({
        center: shouldRotate
          ? [
              plated_hole.x + holeOffsetX,
              plated_hole.y + holeOffsetY + rectLength / 2,
              0,
            ]
          : [
              plated_hole.x + holeOffsetX + rectLength / 2,
              plated_hole.y + holeOffsetY,
              0,
            ],
        radius: holeRadius - M,
        height: throughDrillHeight * 1.1,
      }),
    )

    const barrelWithHole = subtract(barrel, barrelHoleCut)

    // --- Combine all copper pieces ---
    const finalCopper = maybeClip(
      union(copperTopPadCut, copperBottomPadCut, copperFillCut, barrelWithHole),
      clipGeom,
    )

    return colorize(colors.copper, finalCopper)
  }
  if (plated_hole.shape === "rotated_pill_hole_with_rect_pad") {
    const holeOffsetX = plated_hole.hole_offset_x || 0
    const holeOffsetY = plated_hole.hole_offset_y || 0
    const holeWidth = plated_hole.hole_width!
    const holeHeight = plated_hole.hole_height!
    const holeRadius = holeHeight / 2
    const rectLength = Math.abs(holeWidth - holeHeight)
    const holeRotationRad =
      ((plated_hole.hole_ccw_rotation || 0) * Math.PI) / 180

    const padWidth = plated_hole.rect_pad_width!
    const padHeight = plated_hole.rect_pad_height!
    const rectBorderRadius = extractRectBorderRadius(plated_hole)
    const padRotationRad =
      ((plated_hole.rect_ccw_rotation || 0) * Math.PI) / 180

    const barrelMargin = 0.03

    // Helper function to create a rotated pill section
    const createRotatedPillSection = (
      width: number,
      height: number,
      thickness: number,
      centerX: number,
      centerY: number,
      centerZ: number,
      rotationRad: number,
    ) => {
      const radius = height / 2
      const length = Math.abs(width - height)

      if (length <= 1e-6) {
        return cylinder({
          center: [centerX, centerY, centerZ],
          radius,
          height: thickness,
        })
      }

      const rect = cuboid({
        center: [0, 0, centerZ],
        size: [length, height, thickness],
      })

      const leftCap = cylinder({
        center: [-length / 2, 0, centerZ],
        radius,
        height: thickness,
      })

      const rightCap = cylinder({
        center: [length / 2, 0, centerZ],
        radius,
        height: thickness,
      })

      const pillUnion = union(rect, leftCap, rightCap)
      const rotated = rotateZ(rotationRad, pillUnion)
      return translate([centerX, centerY, 0], rotated)
    }

    // --- Barrel (rotated) ---
    const barrel = createRotatedPillSection(
      holeWidth + 2 * barrelMargin,
      holeHeight + 2 * barrelMargin,
      copperSpan,
      plated_hole.x + holeOffsetX,
      plated_hole.y + holeOffsetY,
      0,
      holeRotationRad,
    )

    // --- Hole cutout (rotated) ---
    const holeCut = createRotatedPillSection(
      holeWidth,
      holeHeight,
      throughDrillHeight * 1.1,
      plated_hole.x + holeOffsetX,
      plated_hole.y + holeOffsetY,
      0,
      holeRotationRad,
    )

    // --- Pads and fill (rotated) ---
    const createRotatedRectPadGeom = (
      width: number,
      height: number,
      thickness: number,
      center: [number, number, number],
      borderRadius: number | null | undefined,
      rotationRad: number,
    ) => {
      const clampedRadius = clampRectBorderRadius(width, height, borderRadius)

      let rect2d
      if (clampedRadius <= 0) {
        // Create a simple rectangle using cuboid
        const baseGeom = cuboid({
          center: [0, 0, center[2]],
          size: [width, height, thickness],
        })
        const rotated = rotateZ(rotationRad, baseGeom)
        return translate([center[0], center[1], 0], rotated)
      } else {
        rect2d = roundedRectangle({
          size: [width, height],
          roundRadius: clampedRadius,
          segments: RECT_PAD_SEGMENTS,
        })
        const extruded = extrudeLinear({ height: thickness }, rect2d)
        const offsetZ = center[2] - thickness / 2
        const translated = translate([0, 0, offsetZ], extruded)
        const rotated = rotateZ(rotationRad, translated)
        return translate([center[0], center[1], 0], rotated)
      }
    }

    const copperTopPad = createRotatedRectPadGeom(
      padWidth,
      padHeight,
      platedHoleLipHeight,
      [plated_hole.x, plated_hole.y, topSurfaceZ],
      rectBorderRadius,
      padRotationRad,
    )

    const copperBottomPad = createRotatedRectPadGeom(
      padWidth,
      padHeight,
      platedHoleLipHeight,
      [plated_hole.x, plated_hole.y, bottomSurfaceZ],
      rectBorderRadius,
      padRotationRad,
    )

    const copperFill = (() => {
      const height = Math.max(copperSpan - platedHoleLipHeight * 2, M)
      const topPadBottom = topSurfaceZ
      const bottomPadTop = bottomSurfaceZ
      const centerZ = (topPadBottom + bottomPadTop) / 2
      const rect2d = roundedRectangle({
        size: [padWidth, padHeight],
        roundRadius: rectBorderRadius || 0,
        segments: RECT_PAD_SEGMENTS,
      })
      const extruded = extrudeLinear({ height }, rect2d)
      const translated = translate([0, 0, centerZ - height / 2], extruded)
      const rotated = rotateZ(padRotationRad, translated)
      return translate([plated_hole.x, plated_hole.y, 0], rotated)
    })()

    // --- Cut pads with the hole ---
    const copperTopPadCut = subtract(copperTopPad, holeCut)
    const copperBottomPadCut = subtract(copperBottomPad, holeCut)
    const copperFillCut = subtract(copperFill, holeCut)

    // --- Barrel internal cut (keeps thin copper rim) ---
    const barrelHoleCut = createRotatedPillSection(
      holeWidth - 2 * M,
      holeHeight - 2 * M,
      throughDrillHeight * 1.1,
      plated_hole.x + holeOffsetX,
      plated_hole.y + holeOffsetY,
      0,
      holeRotationRad,
    )

    const barrelWithHole = subtract(barrel, barrelHoleCut)

    // --- Combine all copper pieces ---
    const finalCopper = maybeClip(
      union(copperTopPadCut, copperBottomPadCut, copperFillCut, barrelWithHole),
      clipGeom,
    )

    return colorize(colors.copper, finalCopper)
  } else if (plated_hole.shape === "hole_with_polygon_pad") {
    const padOutline = plated_hole.pad_outline
    if (!Array.isArray(padOutline) || padOutline.length < 3) {
      throw new Error(
        `Invalid pad_outline for plated hole at (${plated_hole.x}, ${plated_hole.y})`,
      )
    }

    const polygonPoints = padOutline.map((point: { x: number; y: number }) => [
      point.x,
      point.y,
    ])
    const polygon2d = jscadPolygon({ points: polygonPoints as any })
    const centerZ = (topSurfaceZ + bottomSurfaceZ) / 2

    const createPolygonPad = (thickness: number, zCenter: number) => {
      const safeThickness = Math.max(thickness, M)
      const extruded = extrudeLinear({ height: safeThickness }, polygon2d)
      return translate(
        [plated_hole.x, plated_hole.y, zCenter - safeThickness / 2],
        extruded,
      )
    }

    const mainFill = createPolygonPad(
      Math.max(copperSpan - platedHoleLipHeight * 2, M),
      centerZ,
    )
    const topPad = createPolygonPad(platedHoleLipHeight, topSurfaceZ)
    const bottomPad = createPolygonPad(platedHoleLipHeight, bottomSurfaceZ)

    const copperSolid = maybeClip(union(mainFill, topPad, bottomPad), clipGeom)
    const barrel = createHoleWithPolygonPadHoleGeom(plated_hole, copperSpan)
    if (!barrel) return colorize(colors.copper, copperSolid)

    const drill =
      createHoleWithPolygonPadHoleGeom(plated_hole, throughDrillHeight, {
        sizeDelta: -2 * M,
      }) || barrel

    let finalCopper = union(subtract(copperSolid, barrel), barrel)

    if (options.clipGeom) {
      finalCopper = subtract(finalCopper, drill)
      finalCopper = intersect(finalCopper, options.clipGeom)
      return colorize(colors.copper, finalCopper)
    }

    return colorize(colors.copper, subtract(finalCopper, drill))
  } else {
    throw new Error(`Unsupported plated hole shape: ${plated_hole.shape}`)
  }
}
