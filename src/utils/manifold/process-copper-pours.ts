import type { ManifoldToplevel, CrossSection } from "manifold-3d/manifold.d.ts"
import type { AnyCircuitElement, PcbCopperPour } from "circuit-json"
import * as THREE from "three"
import { manifoldMeshToThreeGeometry } from "../manifold-mesh-to-three-geometry"
import {
  colors as defaultColors,
  DEFAULT_SMT_PAD_THICKNESS,
  MANIFOLD_Z_OFFSET,
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
