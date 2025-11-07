import type { PcbSilkscreenCircle } from "circuit-json"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { circle } from "@jscad/modeling/src/primitives"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { translate } from "@jscad/modeling/src/operations/transforms"
import { colorize } from "@jscad/modeling/src/colors"
import type { GeomContext } from "../GeomContext"
import { coerceDimensionToMm, parseDimensionToMm } from "../utils/units"
import { M } from "./constants"
import { subtract } from "@jscad/modeling/src/operations/booleans"

const CIRCLE_SEGMENTS = 64

export function createSilkscreenCircleGeom(
  circleEl: PcbSilkscreenCircle,
  ctx: GeomContext,
): Geom3 | undefined {
  const radius = coerceDimensionToMm(circleEl.radius, 0)
  if (radius <= 0) return undefined

  const strokeWidth = coerceDimensionToMm(circleEl.stroke_width, 0.12)
  const hasStroke = strokeWidth > 0

  const centerX = parseDimensionToMm(circleEl.center?.x) ?? 0
  const centerY = parseDimensionToMm(circleEl.center?.y) ?? 0

  const layerSign = circleEl.layer === "bottom" ? -1 : 1
  const zPos = (layerSign * ctx.pcbThickness) / 2 + layerSign * M * 1.5

  const baseHeight = 0.012

  let circleGeom: Geom3

  if (hasStroke) {
    const outerRadius = radius + strokeWidth / 2
    const innerRadius = radius - strokeWidth / 2

    const outerCircle2d = circle({ radius: outerRadius, segments: CIRCLE_SEGMENTS })
    let ring3d = extrudeLinear({ height: baseHeight }, outerCircle2d)

    if (innerRadius > 0) {
      const innerCircle2d = circle({ radius: innerRadius, segments: CIRCLE_SEGMENTS })
      const inner3d = extrudeLinear({ height: baseHeight }, innerCircle2d)
      ring3d = subtract(ring3d, inner3d)
    }

    circleGeom = ring3d
  } else {
    const filledCircle2d = circle({ radius, segments: CIRCLE_SEGMENTS })
    circleGeom = extrudeLinear({ height: baseHeight }, filledCircle2d)
  }

  const translatedGeom = translate([centerX, centerY, zPos], circleGeom)

  return colorize([1, 1, 1], translatedGeom)
}

