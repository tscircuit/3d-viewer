import type { ManifoldToplevel } from "manifold-3d"

export function createCircleHoleDrill({
  Manifold,
  x,
  y,
  diameter,
  thickness,
  segments = 32,
}: {
  Manifold: ManifoldToplevel["Manifold"]
  x: number
  y: number
  diameter: number
  thickness: number
  segments?: number
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
}: {
  Manifold: ManifoldToplevel["Manifold"]
  x: number
  y: number
  holeDiameter: number
  thickness: number
  zOffset?: number
  segments?: number
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
