import type { PcbSilkscreenRect } from "circuit-json"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { roundedRectangle } from "@jscad/modeling/src/primitives"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { translate, rotateZ } from "@jscad/modeling/src/operations/transforms"
import { colorize } from "@jscad/modeling/src/colors"
import type { GeomContext } from "../GeomContext"
import { coerceDimensionToMm, parseDimensionToMm } from "../utils/units"
import { clampRectBorderRadius, extractRectBorderRadius } from "../utils/rect-border-radius"
import { M } from "./constants"

const RECT_SEGMENTS = 64

export function createSilkscreenRectGeom(
  rect: PcbSilkscreenRect,
  ctx: GeomContext,
): Geom3 | undefined {
  const width = coerceDimensionToMm(rect.width, 0)
  const height = coerceDimensionToMm(rect.height, 0)
  if (width <= 0 || height <= 0) return undefined

  const centerX = parseDimensionToMm(rect.center?.x) ?? 0
  const centerY = parseDimensionToMm(rect.center?.y) ?? 0

  const rawBorderRadius = extractRectBorderRadius(rect)
  const borderRadius = clampRectBorderRadius(
    width,
    height,
    typeof rawBorderRadius === "string"
      ? parseDimensionToMm(rawBorderRadius)
      : rawBorderRadius,
  )

  const rect2d = roundedRectangle({
    size: [width, height],
    roundRadius: borderRadius,
    segments: RECT_SEGMENTS,
  })

  let rectGeom = extrudeLinear({ height: 0.012 }, rect2d)

  const rotationDeg = rect.ccw_rotation ?? rect.rotation ?? 0
  if (rotationDeg) {
    const rotationRad = (rotationDeg * Math.PI) / 180
    rectGeom = rotateZ(rotationRad, rectGeom)
  }

  const layerSign = rect.layer === "bottom" ? -1 : 1
  const zPos =
    (layerSign * ctx.pcbThickness) / 2 + layerSign * M * 1.5

  rectGeom = translate([centerX, centerY, zPos], rectGeom)

  return colorize([1, 1, 1], rectGeom)
}
