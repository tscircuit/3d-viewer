import type { ManifoldToplevel } from "manifold-3d"
import type { AnyCircuitElement, PcbVia } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import * as THREE from "three"
import { createPlatedHoleDrill } from "../hole-geoms"
import { createViaCopper } from "../via-geoms"
import { manifoldMeshToThreeGeometry } from "../manifold-mesh-to-three-geometry"
import {
  colors as defaultColors,
  MANIFOLD_Z_OFFSET,
  SMOOTH_CIRCLE_SEGMENTS,
} from "../../geoms/constants"

const COPPER_COLOR = new THREE.Color(...defaultColors.copper)

export interface ProcessViasResult {
  viaBoardDrills: any[]
  viaCopperGeoms: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }>
}

export function processViasForManifold(
  Manifold: ManifoldToplevel["Manifold"],
  circuitJson: AnyCircuitElement[],
  pcbThickness: number,
  manifoldInstancesForCleanup: any[],
  boardClipVolume?: any,
): ProcessViasResult {
  const viaBoardDrills: any[] = []
  const pcbVias = su(circuitJson).pcb_via.list() as PcbVia[]
  const viaCopperGeoms: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }> = []

  pcbVias.forEach((via: PcbVia, index: number) => {
    // Board cut for vias
    if (typeof via.hole_diameter === "number") {
      const translatedDrill = createPlatedHoleDrill({
        Manifold,
        x: via.x,
        y: via.y,
        holeDiameter: via.hole_diameter,
        thickness: pcbThickness,
        zOffset: MANIFOLD_Z_OFFSET,
        segments: SMOOTH_CIRCLE_SEGMENTS,
      })
      manifoldInstancesForCleanup.push(translatedDrill)
      viaBoardDrills.push(translatedDrill)
    }

    // Copper part of vias
    if (
      typeof via.outer_diameter === "number" &&
      typeof via.hole_diameter === "number"
    ) {
      const translatedViaCopper = createViaCopper({
        Manifold,
        x: via.x,
        y: via.y,
        outerDiameter: via.outer_diameter,
        holeDiameter: via.hole_diameter,
        thickness: pcbThickness,
        zOffset: MANIFOLD_Z_OFFSET,
        segments: SMOOTH_CIRCLE_SEGMENTS,
      })
      manifoldInstancesForCleanup.push(translatedViaCopper)
      let finalCopperOp: any = translatedViaCopper
      if (boardClipVolume) {
        const clipped = Manifold.intersection([
          translatedViaCopper,
          boardClipVolume,
        ])
        manifoldInstancesForCleanup.push(clipped)
        finalCopperOp = clipped
      }
      const threeGeom = manifoldMeshToThreeGeometry(finalCopperOp.getMesh())
      viaCopperGeoms.push({
        key: `via-${via.pcb_via_id || index}`,
        geometry: threeGeom,
        color: COPPER_COLOR,
      })
    }
  })

  return { viaBoardDrills, viaCopperGeoms }
}
