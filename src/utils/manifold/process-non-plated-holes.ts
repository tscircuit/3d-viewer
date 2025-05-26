import type { ManifoldToplevel } from "manifold-3d/manifold.d.ts"
import type { AnyCircuitElement, PcbHole } from "circuit-json"
import { su } from "@tscircuit/soup-util"
import { createCircleHoleDrill } from "../hole-geoms"
import { SMOOTH_CIRCLE_SEGMENTS } from "../../geoms/constants"

// Type guard for PcbHole with hole_diameter
function isCircleHole(hole: any): hole is {
  x: number
  y: number
  hole_diameter: number
  hole_shape?: string
  shape?: string
} {
  return (
    (hole.shape === "circle" || hole.hole_shape === "circle") &&
    typeof hole.hole_diameter === "number"
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
    }
  })
  return { nonPlatedHoleBoardDrills }
}
