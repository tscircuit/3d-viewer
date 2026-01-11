import type { ManifoldToplevel } from "manifold-3d"
import type {
  AnyCircuitElement,
  PcbHole,
  PcbHolePill,
  PcbHoleRotatedPill,
} from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { createCircleHoleDrill } from "../hole-geoms"
import { SMOOTH_CIRCLE_SEGMENTS } from "../../geoms/constants"
import { createRoundedRectPrism } from "../pad-geoms"

// Type guard for PcbHole with hole_diameter
function isCircleHole(hole: any): hole is {
  x: number
  y: number
  hole_diameter: number
  hole_shape?: string
  shape?: string
} {
  return hole.hole_shape === "circle" && typeof hole.hole_diameter === "number"
}

// Type guard for PcbHolePill
function isPillHole(hole: any): hole is PcbHolePill {
  return (
    (hole.shape === "pill" || hole.hole_shape === "pill") &&
    typeof hole.hole_width === "number" &&
    typeof hole.hole_height === "number"
  )
}

// Type guard for PcbHoleRotatedPill
function isRotatedPillHole(hole: any): hole is PcbHoleRotatedPill {
  return (
    (hole.shape === "rotated_pill" || hole.hole_shape === "rotated_pill") &&
    typeof hole.hole_width === "number" &&
    typeof hole.hole_height === "number" &&
    typeof hole.ccw_rotation === "number"
  )
}

export interface ProcessNonPlatedHolesResult {
  nonPlatedHoleBoardDrills: any[]
}

export function processNonPlatedHolesForManifold(
  Manifold: ManifoldToplevel["Manifold"],
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

  pcbHoles.forEach((hole: PcbHole) => {
    if (isCircleHole(hole)) {
      const translatedDrill = createCircleHoleDrill({
        Manifold,
        x: hole.x,
        y: hole.y,
        diameter: hole.hole_diameter,
        thickness: pcbThickness,
        segments: SMOOTH_CIRCLE_SEGMENTS,
      })
      manifoldInstancesForCleanup.push(translatedDrill)
      nonPlatedHoleBoardDrills.push(translatedDrill)
    } else if (isPillHole(hole)) {
      const holeW = hole.hole_width
      const holeH = hole.hole_height
      const drillDepth = pcbThickness * 1.2 // Ensure cut-through

      const pillDrillOp = createPillOp(holeW, holeH, drillDepth)
      const translatedPillDrill = pillDrillOp.translate([hole.x, hole.y, 0])
      manifoldInstancesForCleanup.push(translatedPillDrill)
      nonPlatedHoleBoardDrills.push(translatedPillDrill)
    } else if (isRotatedPillHole(hole)) {
      const holeW = hole.hole_width
      const holeH = hole.hole_height
      const drillDepth = pcbThickness * 1.2 // Ensure cut-through

      let pillDrillOp = createPillOp(holeW, holeH, drillDepth)

      // Apply rotation for rotated_pill shape
      const rotatedOp = pillDrillOp.rotate([0, 0, hole.ccw_rotation])
      manifoldInstancesForCleanup.push(rotatedOp)
      pillDrillOp = rotatedOp

      const translatedPillDrill = pillDrillOp.translate([hole.x, hole.y, 0])
      manifoldInstancesForCleanup.push(translatedPillDrill)
      nonPlatedHoleBoardDrills.push(translatedPillDrill)
    }
  })
  return { nonPlatedHoleBoardDrills }
}
