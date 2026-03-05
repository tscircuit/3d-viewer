export function createViaCopper({
  Manifold,
  x,
  y,
  outerDiameter,
  holeDiameter,
  thickness,
  zOffset = 0.001,
  segments = 32,
}) {
  const platingThickness = zOffset // Visual thickness for the barrel wall

  if (outerDiameter < holeDiameter) {
    throw new Error(
      `Invalid via geometry: outerDiameter (${outerDiameter}) must be >= holeDiameter (${holeDiameter})`,
    )
  }

  // Ensure the barrel isn't wider than the pads
  const barrelRadius = Math.min(
    outerDiameter / 2,
    holeDiameter / 2 + platingThickness,
  )

  // Central barrel connecting the pads
  const barrel = Manifold.cylinder(thickness, barrelRadius, -1, segments, true)

  // Keep only through-board barrel; top/bottom annular copper is rendered in texture
  const viaSolid = barrel

  // Create the hole to drill through
  const drillHeight = thickness + 2 * zOffset
  const drill = Manifold.cylinder(
    drillHeight,
    holeDiameter / 2,
    -1,
    segments,
    true,
  )

  // Subtract the hole
  const finalViaCopperOp = viaSolid.subtract(drill)

  return finalViaCopperOp.translate([x, y, 0])
}
