import type {
  ManifoldToplevel,
  Mesh as ManifoldMesh,
} from "manifold-3d/manifold.d.ts"
import type { AnyCircuitElement, PcbSmtPad } from "circuit-json"
import { su } from "@tscircuit/soup-util"
import * as THREE from "three"
import { createPadManifoldOp } from "../pad-geoms"
import {
  colors as defaultColors,
  MANIFOLD_Z_OFFSET,
  DEFAULT_SMT_PAD_THICKNESS,
} from "../../geoms/constants"

const COPPER_COLOR = new THREE.Color(...defaultColors.copper)

export interface ProcessSmtPadsResult {
  smtPadGeoms: Array<{
    key: string
    geometry: ManifoldMesh
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
    geometry: ManifoldMesh
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
      const translatedPad = padManifoldOp.translate([pad.x, pad.y, zPos])
      manifoldInstancesForCleanup.push(translatedPad)

      smtPadGeoms.push({
        key: `pad-${pad.pcb_smtpad_id || index}`,
        geometry: translatedPad.getMesh(),
        color: COPPER_COLOR,
      })
    }
  })
  return { smtPadGeoms }
}
