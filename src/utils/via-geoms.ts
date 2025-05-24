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
  const copperPartThickness = thickness + 2 * zOffset
  let viaCopper = Manifold.cylinder(
    copperPartThickness,
    outerDiameter / 2,
    -1,
    segments,
    true,
  )
  const drill = Manifold.cylinder(
    copperPartThickness * 1.05,
    holeDiameter / 2,
    -1,
    segments,
    true,
  )
  const finalViaCopperOp = viaCopper.subtract(drill)
  return finalViaCopperOp.translate([x, y, 0])
}
