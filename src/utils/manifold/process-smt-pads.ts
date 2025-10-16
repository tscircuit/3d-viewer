import type { ManifoldToplevel } from "manifold-3d/manifold.d.ts"
import type { AnyCircuitElement, PcbSmtPad } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import * as THREE from "three"
import { createPadManifoldOp } from "../pad-geoms"
import { manifoldMeshToThreeGeometry } from "../manifold-mesh-to-three-geometry"
import {
  colors as defaultColors,
  MANIFOLD_Z_OFFSET,
  DEFAULT_SMT_PAD_THICKNESS,
} from "../../geoms/constants"

const COPPER_COLOR = new THREE.Color(...defaultColors.copper)

export interface ProcessSmtPadsResult {
  smtPadGeoms: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }>
}

export function processSmtPadsForManifold(
  Manifold: ManifoldToplevel["Manifold"],
  circuitJson: AnyCircuitElement[],
  pcbThickness: number,
  manifoldInstancesForCleanup: any[],
  holeUnion?: any,
  boardClipVolume?: any,
): ProcessSmtPadsResult {
  const smtPadGeoms: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }> = []
  const smtPads = su(circuitJson).pcb_smtpad.list()

  smtPads.forEach((pad: PcbSmtPad, index: number) => {
    const padBaseThickness = DEFAULT_SMT_PAD_THICKNESS
    const zPos =
      pad.layer === "bottom"
        ? -pcbThickness / 2 - padBaseThickness / 2 - MANIFOLD_Z_OFFSET
        : pcbThickness / 2 + padBaseThickness / 2 + MANIFOLD_Z_OFFSET

    let padManifoldOp = createPadManifoldOp({
      Manifold,
      pad,
      padBaseThickness,
    })

    if (padManifoldOp) {
      manifoldInstancesForCleanup.push(padManifoldOp)
      // @ts-ignore
      const translatedPad = padManifoldOp.translate([pad.x, pad.y, zPos])
      manifoldInstancesForCleanup.push(translatedPad)
      let finalPadOp = translatedPad
      if (holeUnion) {
        finalPadOp = translatedPad.subtract(holeUnion)
        manifoldInstancesForCleanup.push(finalPadOp)
      }
      if (boardClipVolume) {
        const clipped = Manifold.intersection([finalPadOp, boardClipVolume])
        manifoldInstancesForCleanup.push(clipped)
        finalPadOp = clipped
      }
      const threeGeom = manifoldMeshToThreeGeometry(finalPadOp.getMesh())
      smtPadGeoms.push({
        key: `pad-${pad.layer}-${pad.pcb_smtpad_id || index}`,
        geometry: threeGeom,
        color: COPPER_COLOR,
      })
    }
  })
  return { smtPadGeoms }
}
