import type { ManifoldToplevel, CrossSection } from "manifold-3d/manifold.d.ts"
import type { AnyCircuitElement, PcbCopperPour } from "circuit-json"
import * as THREE from "three"
import { manifoldMeshToThreeGeometry } from "../manifold-mesh-to-three-geometry"
import {
  colors as defaultColors,
  DEFAULT_SMT_PAD_THICKNESS,
  MANIFOLD_Z_OFFSET,
  SMOOTH_CIRCLE_SEGMENTS,
} from "../../geoms/constants"

const COPPER_COLOR = new THREE.Color(...defaultColors.copper)

const arePointsClockwise = (points: Array<[number, number]>): boolean => {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    if (points[i] && points[j]) {
      area += points[i]![0] * points[j]![1]
      area -= points[j]![0] * points[i]![1]
    }
  }
  const signedArea = area / 2
  return signedArea <= 0
}

type PointWithBulge = { x: number; y: number; bulge?: number }
type Ring = { vertices: PointWithBulge[] }

function segmentToPoints(
  p1: [number, number],
  p2: [number, number],
  bulge: number,
  arcSegments: number,
): [number, number][] {
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

  const midPoint: [number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]
  const ux = dx / dist
  const uy = dy / dist
  const nx = -uy
  const ny = ux

  const centerX = midPoint[0] + nx * m * Math.sign(bulge)
  const centerY = midPoint[1] + ny * m * Math.sign(bulge)

  const startAngle = Math.atan2(p1[1] - centerY, p1[0] - centerX)

  const points: [number, number][] = []
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

function ringToPoints(ring: Ring, arcSegments: number): [number, number][] {
  const allPoints: [number, number][] = []
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

export interface ProcessCopperPoursResult {
  copperPourGeoms: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }>
}

export function processCopperPoursForManifold(
  Manifold: ManifoldToplevel["Manifold"],
  CrossSection: ManifoldToplevel["CrossSection"],
  circuitJson: AnyCircuitElement[],
  pcbThickness: number,
  manifoldInstancesForCleanup: any[],
  holeUnion?: any,
): ProcessCopperPoursResult {
  const copperPourGeoms: ProcessCopperPoursResult["copperPourGeoms"] = []
  const copperPours = circuitJson.filter(
    (e) => e.type === "pcb_copper_pour",
  ) as PcbCopperPour[]

  for (const pour of copperPours) {
    const pourThickness = DEFAULT_SMT_PAD_THICKNESS
    const layerSign = pour.layer === "bottom" ? -1 : 1
    const zPos =
      layerSign * (pcbThickness / 2 + pourThickness / 2 + MANIFOLD_Z_OFFSET)
    let pourOp: any

    if (pour.shape === "rect") {
      pourOp = Manifold.cube([pour.width, pour.height, pourThickness], true)
      manifoldInstancesForCleanup.push(pourOp)

      if (pour.rotation) {
        const rotatedOp = pourOp.rotate([0, 0, pour.rotation])
        manifoldInstancesForCleanup.push(rotatedOp)
        pourOp = rotatedOp
      }
      pourOp = pourOp.translate([pour.center.x, pour.center.y, zPos])
      manifoldInstancesForCleanup.push(pourOp)
    } else if (pour.shape === "polygon") {
      if (pour.points.length < 3) continue
      let pointsVec2: Array<[number, number]> = pour.points.map((p) => [
        p.x,
        p.y,
      ])
      if (arePointsClockwise(pointsVec2)) {
        pointsVec2 = pointsVec2.reverse()
      }
      const crossSection = CrossSection.ofPolygons([pointsVec2])
      manifoldInstancesForCleanup.push(crossSection)
      pourOp = Manifold.extrude(
        crossSection,
        pourThickness,
        0, // nDivisions
        0, // twistDegrees
        [1, 1], // scaleTop
        true, // center extrusion
      ).translate([0, 0, zPos])
      manifoldInstancesForCleanup.push(pourOp)
    } else if (pour.shape === "brep") {
      const brepShape = (pour as any).brep_shape
      if (!brepShape || !brepShape.outer_ring) continue

      let outerRingPoints = ringToPoints(
        brepShape.outer_ring,
        SMOOTH_CIRCLE_SEGMENTS,
      )
      if (arePointsClockwise(outerRingPoints)) {
        outerRingPoints = outerRingPoints.reverse() // Manifold wants CCW for solid
      }

      const polygons = [outerRingPoints]

      if (brepShape.inner_rings) {
        const innerRingsPoints = brepShape.inner_rings.map((ring) => {
          let points = ringToPoints(ring, SMOOTH_CIRCLE_SEGMENTS)
          if (!arePointsClockwise(points)) {
            points = points.reverse() // Manifold wants CW for holes
          }
          return points
        })
        polygons.push(...innerRingsPoints)
      }

      const crossSection = CrossSection.ofPolygons(polygons)
      manifoldInstancesForCleanup.push(crossSection)
      pourOp = Manifold.extrude(
        crossSection,
        pourThickness,
        0, // nDivisions
        0, // twistDegrees
        [1, 1], // scaleTop
        true, // center extrusion
      ).translate([0, 0, zPos])
      manifoldInstancesForCleanup.push(pourOp)
    }

    if (pourOp) {
      if (holeUnion) {
        const withHoles = pourOp.subtract(holeUnion)
        manifoldInstancesForCleanup.push(withHoles)
        pourOp = withHoles
      }
      const threeGeom = manifoldMeshToThreeGeometry(pourOp.getMesh())
      copperPourGeoms.push({
        key: `coppour-${pour.pcb_copper_pour_id}`,
        geometry: threeGeom,
        color: COPPER_COLOR,
      })
    }
  }

  return { copperPourGeoms }
}
