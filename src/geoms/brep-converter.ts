import { polygon } from "@jscad/modeling/src/primitives"
import { subtract } from "@jscad/modeling/src/operations/booleans"
import type { Vec2 } from "@jscad/modeling/src/maths/types"

type PointWithBulge = { x: number; y: number; bulge?: number }
type Ring = { vertices: PointWithBulge[] }

// Convert a single arc segment (defined by two points and a bulge factor) to a series of points.
function segmentToPoints(
  p1: Vec2,
  p2: Vec2,
  bulge: number,
  arcSegments: number,
): Vec2[] {
  if (!bulge || Math.abs(bulge) < 1e-9) {
    return [] // Straight line segment, no intermediate points
  }

  const theta = 4 * Math.atan(bulge)
  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist < 1e-9) return []

  const radius = Math.abs(dist / (2 * Math.sin(theta / 2)))

  const m = Math.sqrt(Math.max(0, radius * radius - (dist / 2) * (dist / 2)))

  const midPoint: Vec2 = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]
  const ux = dx / dist
  const uy = dy / dist
  const nx = -uy
  const ny = ux

  const centerX = midPoint[0] + nx * m * Math.sign(bulge)
  const centerY = midPoint[1] + ny * m * Math.sign(bulge)

  const startAngle = Math.atan2(p1[1] - centerY, p1[0] - centerX)

  const points: Vec2[] = []
  // Increase segments for larger arcs
  const numSteps = Math.max(
    2,
    Math.ceil(((arcSegments * Math.abs(theta)) / (Math.PI * 2)) * 4),
  )
  const angleStep = theta / numSteps

  for (let i = 1; i < numSteps; i++) {
    const angle = startAngle + angleStep * i
    points.push([
      centerX + radius * Math.cos(angle),
      centerY + radius * Math.sin(angle),
    ])
  }
  return points
}

// Convert a ring of vertices (with bulges) to a flat array of Vec2 points.
function ringToPoints(ring: Ring, arcSegments: number): Vec2[] {
  const allPoints: Vec2[] = []
  const vertices = ring.vertices

  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i]!
    const p2 = vertices[(i + 1) % vertices.length]!
    allPoints.push([p1.x, p1.y])
    if (p1.bulge) {
      const arcPoints = segmentToPoints(
        [p1.x, p1.y],
        [p2.x, p2.y],
        p1.bulge,
        arcSegments,
      )
      allPoints.push(...arcPoints)
    }
  }
  return allPoints
}

// Check if a polygon is wound clockwise
function arePointsClockwise(points: Vec2[]): boolean {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i]![0] * points[j]![1]
    area -= points[j]![0] * points[i]![1]
  }
  return area / 2 <= 0
}

export function createGeom2FromBRep(
  brep: {
    outer_ring: Ring
    inner_rings: Ring[]
  },
  arcSegments = 16,
): any /*Geom2*/ {
  let outerPoints = ringToPoints(brep.outer_ring, arcSegments)
  if (arePointsClockwise(outerPoints)) {
    outerPoints.reverse() // Ensure it's CCW for JSCAD
  }
  const outerGeom = polygon({ points: outerPoints })

  if (!brep.inner_rings || brep.inner_rings.length === 0) {
    return outerGeom
  }

  const innerGeoms = brep.inner_rings.map((ring) => {
    let innerPoints = ringToPoints(ring, arcSegments)
    // For holes with subtract, they also need to be solid polygons (CCW)
    if (arePointsClockwise(innerPoints)) {
      innerPoints.reverse()
    }
    return polygon({ points: innerPoints })
  })

  if (innerGeoms.length === 0) return outerGeom

  return subtract(outerGeom, innerGeoms)
}
