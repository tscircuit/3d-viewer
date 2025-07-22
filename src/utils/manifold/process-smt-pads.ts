import type { ManifoldToplevel } from "manifold-3d/manifold.d.ts"
import type { AnyCircuitElement, PcbSmtPad } from "circuit-json"
import { su } from "@tscircuit/soup-util"
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
): ProcessSmtPadsResult {
  const smtPadGeoms: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }> = []
  const smtPads = su(circuitJson).pcb_smtpad.list() as PcbSmtPad[]

  smtPads.forEach((pad: PcbSmtPad, index: number) => {
    const padBaseThickness = DEFAULT_SMT_PAD_THICKNESS
    const zPos =
      pad.layer === "bottom"
        ? -pcbThickness / 2 - padBaseThickness / 2 - MANIFOLD_Z_OFFSET
        : pcbThickness / 2 + padBaseThickness / 2 + MANIFOLD_Z_OFFSET

    const padManifoldOp = createPadManifoldOp({
      Manifold,
      pad,
      padBaseThickness,
    })

    if (padManifoldOp) {
      manifoldInstancesForCleanup.push(padManifoldOp)
      const translatedPad = padManifoldOp.translate([
        (pad as any).x ?? 0,
        (pad as any).y ?? 0,
        zPos,
      ])
      manifoldInstancesForCleanup.push(translatedPad)
      const threeGeom = manifoldMeshToThreeGeometry(translatedPad.getMesh())

      smtPadGeoms.push({
        key: `pad-${pad.pcb_smtpad_id || index}`,
        geometry: threeGeom,
        color: COPPER_COLOR,
      })
    }
  })
  return { smtPadGeoms }
}
