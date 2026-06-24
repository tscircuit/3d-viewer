import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { subtract } from "@jscad/modeling/src/operations/booleans"
import { translate } from "@jscad/modeling/src/operations/transforms"
import { cylinder } from "@jscad/modeling/src/primitives"
import { M, SMOOTH_CIRCLE_SEGMENTS } from "./constants"

/**
 * Creates a 3D geometry for via copper barrel.
 *
 * @param x - X coordinate of via center
 * @param y - Y coordinate of via center
 * @param outerDiameter - Outer diameter of annular rings
 * @param holeDiameter - Diameter of the hole through the via
 * @param thickness - PCB thickness
 * @returns Positioned via copper geometry (uncolored)
 */
export function createViaCopper({
  x,
  y,
  outerDiameter,
  holeDiameter,
  thickness,
}: {
  x: number
  y: number
  outerDiameter: number
  holeDiameter: number
  thickness: number
}): Geom3 {
  if (outerDiameter <= holeDiameter) {
    throw new Error(
      `Invalid via geometry: outerDiameter (${outerDiameter}) must be > holeDiameter (${holeDiameter})`,
    )
  }

  const platingThickness = M // Visual thickness for barrel wall

  // Ensure barrel isn't wider than pads
  const barrelRadius = Math.min(
    outerDiameter / 2,
    holeDiameter / 2 + platingThickness,
  )

  // Central barrel connecting top and bottom pads
  const barrel = cylinder({
    center: [0, 0, 0],
    radius: barrelRadius,
    height: thickness,
    segments: SMOOTH_CIRCLE_SEGMENTS,
  })

  // Keep only through-board barrel; top/bottom annular copper is rendered in texture
  const viaSolid = barrel

  // Create drill hole to subtract
  const drillHeight = thickness + 2 * M
  const drill = cylinder({
    center: [0, 0, 0],
    radius: holeDiameter / 2,
    height: drillHeight,
    segments: SMOOTH_CIRCLE_SEGMENTS,
  })

  // Subtract hole from via solid
  const finalViaCopper = subtract(viaSolid, drill)

  // Position at correct location
  const positionedVia = translate([x, y, 0], finalViaCopper)

  return positionedVia
}

export function createViaBoardDrill({
  x,
  y,
  holeDiameter,
  thickness,
}: {
  x: number
  y: number
  holeDiameter: number
  thickness: number
}): Geom3 {
  const drillHeight = thickness * 1.5 // Ensure it cuts through completely
  const drillRadius = holeDiameter / 2 + M // Add margin for clean subtraction

  const drill = cylinder({
    center: [x, y, 0],
    radius: drillRadius,
    height: drillHeight,
    segments: SMOOTH_CIRCLE_SEGMENTS,
  })

  return drill
}
