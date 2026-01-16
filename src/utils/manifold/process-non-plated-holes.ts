import type { ManifoldToplevel } from "manifold-3d"
import type { AnyCircuitElement, PcbHole } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { createCircleHoleDrill } from "../hole-geoms"
import { SMOOTH_CIRCLE_SEGMENTS } from "../../geoms/constants"
import { createRoundedRectPrism } from "../pad-geoms"

export interface ProcessNonPlatedHolesResult {
  nonPlatedHoleBoardDrills: any[]
}

export function processNonPlatedHolesForManifold(
  Manifold: ManifoldToplevel["Manifold"],
  CrossSection: ManifoldToplevel["CrossSection"],
  circuitJson: AnyCircuitElement[],
  pcbThickness: number,
  manifoldInstancesForCleanup: any[],
): ProcessNonPlatedHolesResult {
  const nonPlatedHoleBoardDrills: any[] = []
  const pcbHoles = su(circuitJson).pcb_hole.list()

  const createPillOp = (width: number, height: number, depth: number) => {
    const pillOp = createRoundedRectPrism({
      Manifold,
      width,
      height,
      thickness: depth,
      borderRadius: Math.min(width, height) / 2,
    })
    manifoldInstancesForCleanup.push(pillOp)
    return pillOp
  }

  const createEllipsePoints = (w: number, h: number, segments: number) => {
    const points: Array<[number, number]> = []
    for (let i = 0; i < segments; i++) {
      const theta = (2 * Math.PI * i) / segments
      points.push([(w / 2) * Math.cos(theta), (h / 2) * Math.sin(theta)])
    }
    return points
  }

  pcbHoles.forEach((hole: PcbHole) => {
    const holeShape = hole.hole_shape
    const holeX = hole.x
    const holeY = hole.y
    const drillDepth = pcbThickness * 1.2
    const rotation = (hole as any).ccw_rotation ?? (hole as any).rotation ?? 0
    const holeW = (hole as any).hole_width ?? (hole as any).hole_diameter
    const holeH = (hole as any).hole_height ?? (hole as any).hole_diameter

    let holeOp: any = null

    if (holeShape === "circle") {
      holeOp = createCircleHoleDrill({
        Manifold,
        x: holeX,
        y: holeY,
        diameter: (hole as any).hole_diameter,
        thickness: pcbThickness,
        segments: SMOOTH_CIRCLE_SEGMENTS,
      })
      nonPlatedHoleBoardDrills.push(holeOp)
      manifoldInstancesForCleanup.push(holeOp)
      return
    }

    if (holeShape === "pill" || holeShape === "rotated_pill") {
      holeOp = createPillOp(holeW, holeH, drillDepth)
    } else if (holeShape === "oval") {
      let points = createEllipsePoints(holeW, holeH, SMOOTH_CIRCLE_SEGMENTS)
      // Ensure correct winding order
      let area = 0
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length
        area += points[i]![0] * points[j]![1]
        area -= points[j]![0] * points[i]![1]
      }
      if (area <= 0) {
        points = points.reverse()
      }
      const crossSection = CrossSection.ofPolygons([points])
      manifoldInstancesForCleanup.push(crossSection)
      holeOp = Manifold.extrude(
        crossSection,
        drillDepth,
        0,
        0,
        [1, 1],
        true, // center
      )
      manifoldInstancesForCleanup.push(holeOp)
    }

    if (holeOp) {
      if (rotation !== 0) {
        const rotatedOp = holeOp.rotate([0, 0, rotation])
        manifoldInstancesForCleanup.push(rotatedOp)
        holeOp = rotatedOp
      }

      const translatedHole = holeOp.translate([holeX, holeY, 0])
      manifoldInstancesForCleanup.push(translatedHole)
      nonPlatedHoleBoardDrills.push(translatedHole)
    }
  })
  return { nonPlatedHoleBoardDrills }
}
