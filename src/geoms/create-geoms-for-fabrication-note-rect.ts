import type { PcbFabricationNoteRect } from "circuit-json"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { roundedRectangle } from "@jscad/modeling/src/primitives"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { translate, rotateZ } from "@jscad/modeling/src/operations/transforms"
import { colorize } from "@jscad/modeling/src/colors"
import { subtract, union } from "@jscad/modeling/src/operations/booleans"
import type { GeomContext } from "../GeomContext"
import { coerceDimensionToMm, parseDimensionToMm } from "../utils/units"
import {
  clampRectBorderRadius,
  extractRectBorderRadius,
} from "../utils/rect-border-radius"
import { M } from "./constants"

const RECT_SEGMENTS = 64

// Helper function to parse color string to RGB array
function parseColor(colorString?: string): [number, number, number] {
  if (!colorString) {
    // Default color: light yellow/orange for fabrication notes
    return [1, 0.95, 0.8]
  }

  // Handle hex colors like "#FF0000" or "FF0000"
  if (colorString.startsWith("#")) {
    colorString = colorString.slice(1)
  }
  if (colorString.length === 6) {
    const r = parseInt(colorString.slice(0, 2), 16) / 255
    const g = parseInt(colorString.slice(2, 4), 16) / 255
    const b = parseInt(colorString.slice(4, 6), 16) / 255
    return [r, g, b]
  }

  // Handle rgb() format
  const rgbMatch = colorString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgbMatch) {
    return [
      parseInt(rgbMatch[1]!, 10) / 255,
      parseInt(rgbMatch[2]!, 10) / 255,
      parseInt(rgbMatch[3]!, 10) / 255,
    ]
  }

  // Default fallback
  return [1, 0.95, 0.8]
}

export function createFabricationNoteRectGeom(
  rect: PcbFabricationNoteRect,
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

  const createRectGeom = (
    rectWidth: number,
    rectHeight: number,
    radius: number,
  ) =>
    extrudeLinear(
      { height: 0.012 },
      roundedRectangle({
        size: [rectWidth, rectHeight],
        roundRadius: radius,
        segments: RECT_SEGMENTS,
      }),
    )

  const isFilled = rect.is_filled ?? true
  const hasStroke = rect.has_stroke ?? false
  const strokeWidth = hasStroke
    ? coerceDimensionToMm(rect.stroke_width, 0.1)
    : 0

  let fillGeom: Geom3 | undefined
  if (isFilled) {
    fillGeom = createRectGeom(width, height, borderRadius)
  }

  let strokeGeom: Geom3 | undefined
  if (hasStroke && strokeWidth > 0) {
    const outerGeom = createRectGeom(width, height, borderRadius)
    const innerWidth = width - strokeWidth * 2
    const innerHeight = height - strokeWidth * 2

    if (innerWidth > 0 && innerHeight > 0) {
      const innerRadius = clampRectBorderRadius(
        innerWidth,
        innerHeight,
        Math.max(borderRadius - strokeWidth, 0),
      )
      const innerGeom = createRectGeom(innerWidth, innerHeight, innerRadius)
      strokeGeom = subtract(outerGeom, innerGeom)
    } else {
      strokeGeom = outerGeom
    }
  }

  let rectGeom = fillGeom
  if (strokeGeom) {
    rectGeom = rectGeom ? union(rectGeom, strokeGeom) : strokeGeom
  }

  if (!rectGeom) return undefined

  const layerSign = rect.layer === "bottom" ? -1 : 1
  const zPos = (layerSign * ctx.pcbThickness) / 2 + layerSign * M * 1.5

  rectGeom = translate([centerX, centerY, zPos], rectGeom)

  const color = parseColor(rect.color)
  return colorize(color, rectGeom)
}
