import type { PcbSilkscreenLine } from "circuit-json"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type { Vec2 } from "@jscad/modeling/src/maths/types"
import { line } from "@jscad/modeling/src/primitives"
import { expand } from "@jscad/modeling/src/operations/expansions"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { translate } from "@jscad/modeling/src/operations/transforms"
import { colorize } from "@jscad/modeling/src/colors"
import type { GeomContext } from "../GeomContext"
import { M } from "./constants"
import { coerceDimensionToMm, parseDimensionToMm } from "../utils/units"

export function createSilkscreenLineGeom(
  sl: PcbSilkscreenLine,
  ctx: GeomContext,
): Geom3 | undefined {
  const x1 = parseDimensionToMm(sl.x1) ?? 0
  const y1 = parseDimensionToMm(sl.y1) ?? 0
  const x2 = parseDimensionToMm(sl.x2) ?? 0
  const y2 = parseDimensionToMm(sl.y2) ?? 0

  if (x1 === x2 && y1 === y2) return undefined

  const routePoints: Vec2[] = [
    [x1, y1],
    [x2, y2],
  ]
  const baseLine = line(routePoints)
  const strokeWidth = coerceDimensionToMm(sl.stroke_width, 0.1)

  const expandedLine = expand(
    { delta: strokeWidth / 2, corners: "round" },
    baseLine,
  )

  const layerSign = sl.layer === "bottom" ? -1 : 1
  const zPos = (layerSign * ctx.pcbThickness) / 2 + layerSign * M * 1.5

  let lineGeom = translate(
    [0, 0, zPos],
    extrudeLinear({ height: 0.012 }, expandedLine),
  )

  lineGeom = colorize([1, 1, 1], lineGeom)
  return lineGeom
}
