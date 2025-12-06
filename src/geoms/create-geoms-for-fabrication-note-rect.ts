import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { roundedRectangle } from "@jscad/modeling/src/primitives"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { translate } from "@jscad/modeling/src/operations/transforms"
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

// Helper function to parse color string to RGB array for JSCAD colorize
function parseFabricationNoteColorToRgb(
  colorString: string | undefined,
): [number, number, number] {
  if (!colorString) {
    // Default fabrication note color: light yellow/orange rgb(255, 243, 204)
    return [255 / 255, 243 / 255, 204 / 255]
  }

  // Handle hex colors like "#FF0000" or "FF0000"
  let hex = colorString
  if (hex.startsWith("#")) {
    hex = hex.slice(1)
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16) / 255
    const g = parseInt(hex.slice(2, 4), 16) / 255
    const b = parseInt(hex.slice(4, 6), 16) / 255
    return [r, g, b]
  }

  // Handle rgb() format like "rgb(255, 243, 204)"
  if (colorString.startsWith("rgb")) {
    const matches = colorString.match(/\d+/g)
    if (matches && matches.length >= 3) {
      return [
        parseInt(matches[0]!) / 255,
        parseInt(matches[1]!) / 255,
        parseInt(matches[2]!) / 255,
      ]
    }
  }

  // Default fallback
  return [255 / 255, 243 / 255, 204 / 255]
}

export function createFabricationNoteRectGeom(
  rect: any, // Fabrication note rect type
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

  // Parse color for fabrication notes (default to light yellow/orange)
  const colorRgb = parseFabricationNoteColorToRgb(rect.color)
  return colorize(colorRgb, rectGeom)
}
