export function createCircleHoleDrill({
  Manifold,
  x,
  y,
  diameter,
  thickness,
  segments = 32,
}) {
  const drill = Manifold.cylinder(
    thickness * 1.2,
    diameter / 2,
    diameter / 2,
    segments,
    true,
  )
  return drill.translate([x, y, 0])
}

export function createPlatedHoleDrill({
  Manifold,
  x,
  y,
  holeDiameter,
  thickness,
  zOffset = 0.001,
  segments = 32,
}) {
  const boardHoleRadius = holeDiameter / 2 + zOffset
  const drill = Manifold.cylinder(
    thickness * 1.2,
    boardHoleRadius,
    boardHoleRadius,
    segments,
    true,
  )
  return drill.translate([x, y, 0])
}
