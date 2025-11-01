import type { PcbSilkscreenPath } from "circuit-json"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type { Vec2 } from "@jscad/modeling/src/maths/types"
import { line } from "@jscad/modeling/src/primitives"
import { expand } from "@jscad/modeling/src/operations/expansions"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { translate } from "@jscad/modeling/src/operations/transforms"
import { colorize } from "@jscad/modeling/src/colors"
import type { GeomContext } from "../GeomContext"
import { M } from "./constants"
import {
  coerceDimensionToMm,
  parseDimensionToMm,
} from "../utils/units"

export function createSilkscreenPathGeom(
  sp: PcbSilkscreenPath,
  ctx: GeomContext,
): Geom3 | undefined {
  if (sp.route.length < 2) return undefined

  const routePoints: Vec2[] = sp.route.map((p) => [
    parseDimensionToMm(p.x) ?? 0,
    parseDimensionToMm(p.y) ?? 0,
  ])
  const pathLine = line(routePoints)

  const strokeWidth = coerceDimensionToMm(sp.stroke_width, 0.1)
  const expandedPath = expand(
    { delta: strokeWidth / 2, corners: "round" },
    pathLine,
  )

  const layerSign = sp.layer === "bottom" ? -1 : 1
  const zPos = (layerSign * ctx.pcbThickness) / 2 + layerSign * M * 1.5 // Slightly offset from board surface

  let pathGeom = translate(
    [0, 0, zPos],
    extrudeLinear({ height: 0.012 }, expandedPath), // Standard silkscreen thickness
  )

  pathGeom = colorize([1, 1, 1], pathGeom) // White for silkscreen
  return pathGeom
}
