import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { subtract, union } from "@jscad/modeling/src/operations/booleans"
import { translate } from "@jscad/modeling/src/operations/transforms"
import { cylinder } from "@jscad/modeling/src/primitives"
import { M, SMOOTH_CIRCLE_SEGMENTS } from "./constants"

/**
 * Creates a 3D geometry for via copper (barrel and annular rings).
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

  const padThickness = M // Visual thickness for annular rings
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

  // Top annular ring
  const topPad = cylinder({
    center: [0, 0, thickness / 2],
    radius: outerDiameter / 2,
    height: padThickness,
    segments: SMOOTH_CIRCLE_SEGMENTS,
  })

  // Bottom annular ring
  const bottomPad = cylinder({
    center: [0, 0, -thickness / 2],
    radius: outerDiameter / 2,
    height: padThickness,
    segments: SMOOTH_CIRCLE_SEGMENTS,
  })

  // Combine barrel and pads
  const viaSolid = union([barrel, topPad, bottomPad])

  // Create drill hole to subtract
  const drillHeight = thickness + padThickness * 2 // Ensure it clears pads
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
