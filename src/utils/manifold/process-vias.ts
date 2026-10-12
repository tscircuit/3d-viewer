import type { ManifoldToplevel } from "manifold-3d"
import type { AnyCircuitElement, PcbVia } from "circuit-json"
import * as THREE from "three"
import { createPlatedHoleDrill } from "../hole-geoms"
import { createViaCopper } from "../via-geoms"
import { getPcbVias } from "../get-pcb-vias"
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
  otherHoleDrills: any[] = [],
): ProcessViasResult {
  const viaBoardDrills: any[] = []
  const pcbVias = getPcbVias(circuitJson)
  const viaCopperGeoms: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }> = []

  const copperOps: { key: string; copper: any; ownDrill: any }[] = []
  pcbVias.forEach((via: PcbVia, index: number) => {
    let ownDrill: any
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
      ownDrill = translatedDrill
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
      copperOps.push({
        key: `via-${via.pcb_via_id || index}`,
        copper: finalCopperOp,
        ownDrill,
      })
    }
  })

  const drillBounds = [...otherHoleDrills, ...viaBoardDrills].map((drill) => ({
    drill,
    bounds: drill.boundingBox(),
  }))
  for (const { key, copper, ownDrill } of copperOps) {
    // Foreign holes remove overlapping barrel walls; the own drill is excluded
    // because its board clearance is wider than the thin copper plating.
    const bounds = copper.boundingBox()
    const drills = drillBounds
      .filter(
        ({ drill, bounds: drillBounds }) =>
          drill !== ownDrill &&
          [0, 1, 2].every(
            (axis) =>
              drillBounds.min[axis] <= bounds.max[axis] &&
              drillBounds.max[axis] >= bounds.min[axis],
          ),
      )
      .map(({ drill }) => drill)
    let cutCopper = copper
    if (drills.length) {
      const drillUnion = Manifold.union(drills)
      cutCopper = copper.subtract(drillUnion)
      manifoldInstancesForCleanup.push(drillUnion, cutCopper)
    }
    viaCopperGeoms.push({
      key,
      geometry: manifoldMeshToThreeGeometry(cutCopper.getMesh()),
      color: COPPER_COLOR,
    })
  }

  return { viaBoardDrills, viaCopperGeoms }
}
