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
  height: number,
  options: { sizeDelta?: number } = {},
): Geom3 | null => {
  const holeShape = hole.hole_shape || "circle"
  const sizeDelta = options.sizeDelta ?? 0
  const offsetX = hole.hole_offset_x || 0
  const offsetY = hole.hole_offset_y || 0
  const center: [number, number, number] = [
    hole.x + offsetX,
    hole.y + offsetY,
    0,
  ]

  if (holeShape === "circle") {
    const diameter = Math.max((hole.hole_diameter ?? 0) + sizeDelta, M)
    const radius = Math.max(diameter / 2, M / 2)
    return cylinder({ center, radius, height })
  }

  const baseWidth = hole.hole_width ?? hole.hole_diameter
  const baseHeight = hole.hole_height ?? hole.hole_diameter
  if (!baseWidth || !baseHeight) {
    return null
  }
  const width = Math.max(baseWidth + sizeDelta, M)
  const heightVal = Math.max(baseHeight + sizeDelta, M)

  if (holeShape === "oval") {
    const ellipsePrism = createEllipsePrism(width, heightVal, height)
    return translate([center[0], center[1], 0], ellipsePrism)
  }

  if (holeShape === "pill" || holeShape === "rotated_pill") {
    let pill = createPillPrism(width, heightVal, height)
    if (!pill) return null
    const rotation = hole.ccw_rotation || 0
    if (rotation) {
      pill = rotateZ((rotation * Math.PI) / 180, pill)
    }
    return translate(center, pill)
  }

  const fallbackDiameter = Math.max(
    (hole.hole_diameter ?? baseWidth ?? baseHeight ?? M) + sizeDelta,
    M,
  )
  return cylinder({ center, radius: fallbackDiameter / 2, height })
}
