import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { cuboid, cylinder, ellipse } from "@jscad/modeling/src/primitives"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { translate, rotateZ } from "@jscad/modeling/src/operations/transforms"
import { union } from "@jscad/modeling/src/operations/booleans"
import { M } from "./constants"

const ELLIPSE_SEGMENTS = 64

export type PolygonPadHoleInput = {
  x: number
  y: number
  hole_shape?: "circle" | "oval" | "pill" | "rotated_pill"
  hole_diameter?: number
  hole_width?: number
  hole_height?: number
  hole_offset_x?: number
  hole_offset_y?: number
  ccw_rotation?: number
}

const createEllipsePrism = (width: number, height: number, depth: number) => {
  const ellipse2d = ellipse({
    center: [0, 0],
    radius: [Math.max(width / 2, M / 2), Math.max(height / 2, M / 2)],
    segments: ELLIPSE_SEGMENTS,
  })
  const extruded = extrudeLinear({ height: depth }, ellipse2d)
  return translate([0, 0, -depth / 2], extruded)
}

const createPillPrism = (width: number, height: number, depth: number) => {
  const clampedWidth = Math.max(width, M)
  const clampedHeight = Math.max(height, M)

  if (Math.abs(clampedWidth - clampedHeight) < 1e-6) {
    return cylinder({
      center: [0, 0, 0],
      radius: clampedWidth / 2,
      height: depth,
    })
  }

  const isHorizontal = clampedWidth >= clampedHeight
  const longDim = isHorizontal ? clampedWidth : clampedHeight
  const shortDim = isHorizontal ? clampedHeight : clampedWidth
  const rectLength = Math.max(longDim - shortDim, 0)

  const rect = cuboid({
    center: [0, 0, 0],
    size: isHorizontal
      ? [rectLength, shortDim, depth]
      : [shortDim, rectLength, depth],
  })

  if (rectLength <= 1e-6) {
    return cylinder({ center: [0, 0, 0], radius: shortDim / 2, height: depth })
  }

  const offset = rectLength / 2
  const firstCap = cylinder({
    center: isHorizontal ? [-offset, 0, 0] : [0, -offset, 0],
    radius: shortDim / 2,
    height: depth,
  })
  const secondCap = cylinder({
    center: isHorizontal ? [offset, 0, 0] : [0, offset, 0],
    radius: shortDim / 2,
    height: depth,
  })

  return union(rect, firstCap, secondCap)
}

export const createHoleWithPolygonPadHoleGeom = (
  hole: PolygonPadHoleInput,
  depth: number,
  options: { sizeDelta?: number } = {},
): Geom3 | null => {
  const holeShape = hole.hole_shape || "circle"
  const sizeDelta = options.sizeDelta ?? 0
  const offsetX = hole.hole_offset_x || 0
  const offsetY = hole.hole_offset_y || 0
  let drill: Geom3

  if (holeShape === "circle") {
    const diameter = Math.max((hole.hole_diameter ?? 0) + sizeDelta, M)
    const radius = diameter / 2
    drill = cylinder({ center: [0, 0, 0], radius, height: depth })
  } else {
    const baseWidth = hole.hole_width ?? hole.hole_diameter
    const baseHeight = hole.hole_height ?? hole.hole_diameter
    if (!baseWidth || !baseHeight) {
      return null
    }
    const shapeWidth = Math.max(baseWidth + sizeDelta, M)
    const shapeHeight = Math.max(baseHeight + sizeDelta, M)

    if (holeShape === "oval") {
      drill = createEllipsePrism(shapeWidth, shapeHeight, depth)
    } else if (holeShape === "pill" || holeShape === "rotated_pill") {
      drill = createPillPrism(shapeWidth, shapeHeight, depth)
    } else {
      const fallbackDiameter = Math.max(
        (hole.hole_diameter ?? baseWidth) + sizeDelta,
        M,
      )
      drill = cylinder({
        center: [0, 0, 0],
        radius: fallbackDiameter / 2,
        height: depth,
      })
    }
  }

  drill = translate([offsetX, offsetY, 0], drill)
  if (hole.ccw_rotation) {
    drill = rotateZ((hole.ccw_rotation * Math.PI) / 180, drill)
  }
  return translate([hole.x, hole.y, 0], drill)
}
