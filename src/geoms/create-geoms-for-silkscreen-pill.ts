import type { PcbSilkscreenPill } from "circuit-json"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { roundedRectangle } from "@jscad/modeling/src/primitives"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { translate } from "@jscad/modeling/src/operations/transforms"
import { colorize } from "@jscad/modeling/src/colors"
import type { GeomContext } from "../GeomContext"
import { coerceDimensionToMm, parseDimensionToMm } from "../utils/units"
import { M } from "./constants"

const PILL_SEGMENTS = 64

export function createSilkscreenPillGeom(
  pill: PcbSilkscreenPill,
  ctx: GeomContext,
): Geom3 | undefined {
  const width = coerceDimensionToMm(pill.width, 0)
  const height = coerceDimensionToMm(pill.height, 0)
  if (width <= 0 || height <= 0) return undefined

  const centerX = parseDimensionToMm(pill.center?.x) ?? 0
  const centerY = parseDimensionToMm(pill.center?.y) ?? 0

  const borderRadius = Math.min(width, height) / 2

  const pillGeom = extrudeLinear(
    { height: 0.012 },
    roundedRectangle({
      size: [width, height],
      roundRadius: borderRadius,
      segments: PILL_SEGMENTS,
    }),
  )

  const layerSign = pill.layer === "bottom" ? -1 : 1
  const zPos = (layerSign * ctx.pcbThickness) / 2 + layerSign * M * 1.5

  const translatedGeom = translate([centerX, centerY, zPos], pillGeom)

  return colorize([1, 1, 1], translatedGeom)
}
import type { PcbSilkscreenPill } from "circuit-json"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { roundedRectangle } from "@jscad/modeling/src/primitives"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { translate } from "@jscad/modeling/src/operations/transforms"
import { subtract, union } from "@jscad/modeling/src/operations/booleans"
import { colorize } from "@jscad/modeling/src/colors"
import type { GeomContext } from "../GeomContext"
import { coerceDimensionToMm, parseDimensionToMm } from "../utils/units"
import { M } from "./constants"

const PILL_SEGMENTS = 64
const SILKSCREEN_HEIGHT = 0.012

const createPillGeom = (width: number, height: number) => {
  const radius = Math.min(width, height) / 2

  return extrudeLinear(
    { height: SILKSCREEN_HEIGHT },
    roundedRectangle({
      size: [width, height],
      roundRadius: radius,
      segments: PILL_SEGMENTS,
    }),
  )
}

export function createSilkscreenPillGeom(
  pill: PcbSilkscreenPill,
  ctx: GeomContext,
): Geom3 | undefined {
  const width = coerceDimensionToMm(pill.width, 0)
  const height = coerceDimensionToMm(pill.height, 0)
  if (width <= 0 || height <= 0) return undefined

  const centerX = parseDimensionToMm(pill.center?.x) ?? 0
  const centerY = parseDimensionToMm(pill.center?.y) ?? 0

  const isFilled = pill.is_filled ?? true
  const hasStroke = pill.has_stroke ?? false
  const strokeWidth = hasStroke
    ? coerceDimensionToMm(pill.stroke_width, 0.1)
    : 0

  let fillGeom: Geom3 | undefined
  if (isFilled) {
    fillGeom = createPillGeom(width, height)
  }

  let strokeGeom: Geom3 | undefined
  if (hasStroke && strokeWidth > 0) {
    const outerGeom = createPillGeom(width, height)
    const innerWidth = width - strokeWidth * 2
    const innerHeight = height - strokeWidth * 2

    if (innerWidth > 0 && innerHeight > 0) {
      const innerGeom = createPillGeom(innerWidth, innerHeight)
      strokeGeom = subtract(outerGeom, innerGeom)
    } else {
      strokeGeom = outerGeom
    }
  }

  let pillGeom = fillGeom
  if (strokeGeom) {
    pillGeom = pillGeom ? union(pillGeom, strokeGeom) : strokeGeom
  }

  if (!pillGeom) return undefined

  const layerSign = pill.layer === "bottom" ? -1 : 1
  const zPos = (layerSign * ctx.pcbThickness) / 2 + layerSign * M * 1.5

  pillGeom = translate([centerX, centerY, zPos], pillGeom)

  return colorize([1, 1, 1], pillGeom)
}

