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
  const padThickness = zOffset // Visual thickness for the annular rings
  const platingThickness = zOffset // Visual thickness for the barrel wall

 if (outerDiameter < holeDiameter) {
  throw new Error(
    `Invalid via geometry: outerDiameter (${outerDiameter}) must be >= holeDiameter (${holeDiameter})`
  )
}

  // Ensure the barrel isn't wider than the pads
  const barrelRadius = Math.min(
    outerDiameter / 2,
    holeDiameter / 2 + platingThickness,
  )

  // Central barrel connecting the pads
  const barrel = Manifold.cylinder(thickness, barrelRadius, -1, segments, true)

  // Top annular ring
  const topPad = Manifold.cylinder(
    padThickness,
    outerDiameter / 2,
    -1,
    segments,
    true,
  ).translate([0, 0, thickness / 2])

  // Bottom annular ring
  const bottomPad = Manifold.cylinder(
    padThickness,
    outerDiameter / 2,
    -1,
    segments,
    true,
  ).translate([0, 0, -thickness / 2])

  // Combine solids
  const viaSolid = Manifold.union([barrel, topPad, bottomPad])

  // Create the hole to drill through
  const drillHeight = thickness + padThickness * 4 // Ensure it clears the pads
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
