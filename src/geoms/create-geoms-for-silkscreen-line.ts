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

export function createSilkscreenLineGeom(
  sl: PcbSilkscreenLine,
  ctx: GeomContext,
): Geom3 {
  const routePoints: Vec2[] = [
    [sl.x1, sl.y1],
    [sl.x2, sl.y2],
  ]
  const baseLine = line(routePoints)
  const strokeWidth = sl.stroke_width || 0.1

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
