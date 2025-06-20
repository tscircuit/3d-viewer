import type { ManifoldToplevel } from "manifold-3d/manifold.d.ts"
import type { AnyCircuitElement, PcbPlatedHole } from "circuit-json"
import { su } from "@tscircuit/soup-util"
import * as THREE from "three"
import { createPlatedHoleDrill } from "../hole-geoms"
import { manifoldMeshToThreeGeometry } from "../manifold-mesh-to-three-geometry"
import {
  colors as defaultColors,
  MANIFOLD_Z_OFFSET,
  SMOOTH_CIRCLE_SEGMENTS,
  M,
} from "../../geoms/constants"

const COPPER_COLOR = new THREE.Color(...defaultColors.copper)
const PAD_LIP_HEIGHT = 0.05

export interface ProcessPlatedHolesResult {
  platedHoleBoardDrills: any[]
  platedHoleCopperGeoms: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }>
}

export function processPlatedHolesForManifold(
  Manifold: ManifoldToplevel["Manifold"],
  circuitJson: AnyCircuitElement[],
  pcbThickness: number,
  manifoldInstancesForCleanup: any[],
): ProcessPlatedHolesResult {
  const platedHoleBoardDrills: any[] = []
  const pcbPlatedHoles = su(circuitJson).pcb_plated_hole.list()
  const platedHoleCopperGeoms: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }> = []

  pcbPlatedHoles.forEach((ph: PcbPlatedHole, index: number) => {
    if (ph.shape === "circle" || ph.shape === "circular_hole_with_rect_pad") {
      // Board cut for plated holes using hole diameter
      const translatedDrill = createPlatedHoleDrill({
        Manifold,
        x: ph.x,
        y: ph.y,
        outerDiameter: ph.hole_diameter,
        thickness: pcbThickness,
        zOffset: MANIFOLD_Z_OFFSET,
        segments: SMOOTH_CIRCLE_SEGMENTS,
      })
      manifoldInstancesForCleanup.push(translatedDrill)
      platedHoleBoardDrills.push(translatedDrill)
    }

    if (ph.shape === "circle") {
      // Copper part of circular plated holes
      const copperPartThickness = pcbThickness + 2 * MANIFOLD_Z_OFFSET
      let platedPart = Manifold.cylinder(
        copperPartThickness,
        ph.outer_diameter / 2,
        -1,
        SMOOTH_CIRCLE_SEGMENTS,
        true,
      )
      manifoldInstancesForCleanup.push(platedPart)
      const drillForCopper = Manifold.cylinder(
        copperPartThickness * 1.05,
        ph.hole_diameter / 2,
        -1,
        SMOOTH_CIRCLE_SEGMENTS,
        true,
      )
      manifoldInstancesForCleanup.push(drillForCopper)
      const finalPlatedPartOp = platedPart.subtract(drillForCopper)
      manifoldInstancesForCleanup.push(finalPlatedPartOp)
      const translatedPlatedPart = finalPlatedPartOp.translate([ph.x, ph.y, 0])
      manifoldInstancesForCleanup.push(translatedPlatedPart)
      const threeGeom = manifoldMeshToThreeGeometry(
        translatedPlatedPart.getMesh(),
      )
      platedHoleCopperGeoms.push({
        key: `ph-${ph.pcb_plated_hole_id || index}`,
        geometry: threeGeom,
        color: COPPER_COLOR,
      })
    } else if (ph.shape === "circular_hole_with_rect_pad") {
      // Copper part with rectangular pads
      const padWidth = ph.rect_pad_width ?? ph.hole_diameter
      const padHeight = ph.rect_pad_height ?? ph.hole_diameter
      const copperPartThickness = pcbThickness + 2 * MANIFOLD_Z_OFFSET
      const holeRadius = Math.max(ph.hole_diameter / 2 - M, 0.01)

      const barrel = Manifold.cylinder(
        copperPartThickness,
        ph.hole_diameter / 2,
        -1,
        SMOOTH_CIRCLE_SEGMENTS,
        true,
      )
      manifoldInstancesForCleanup.push(barrel)

      const topPad = Manifold.cube(
        [padWidth, padHeight, PAD_LIP_HEIGHT],
        true,
      )
      const bottomPad = Manifold.cube(
        [padWidth, padHeight, PAD_LIP_HEIGHT],
        true,
      )
      manifoldInstancesForCleanup.push(topPad, bottomPad)

      const topPadT = topPad.translate([
        ph.x,
        ph.y,
        pcbThickness / 2 + PAD_LIP_HEIGHT / 2 + MANIFOLD_Z_OFFSET,
      ])
      const bottomPadT = bottomPad.translate([
        ph.x,
        ph.y,
        -pcbThickness / 2 - PAD_LIP_HEIGHT / 2 - MANIFOLD_Z_OFFSET,
      ])
      manifoldInstancesForCleanup.push(topPadT, bottomPadT)

      const barrelT = barrel.translate([ph.x, ph.y, 0])
      manifoldInstancesForCleanup.push(barrelT)

      const copperUnion = barrelT.add(topPadT).add(bottomPadT)
      manifoldInstancesForCleanup.push(copperUnion)

      const drillForCopper = Manifold.cylinder(
        copperPartThickness * 1.05,
        holeRadius,
        -1,
        SMOOTH_CIRCLE_SEGMENTS,
        true,
      )
      manifoldInstancesForCleanup.push(drillForCopper)
      const drillT = drillForCopper.translate([ph.x, ph.y, 0])
      manifoldInstancesForCleanup.push(drillT)

      const finalOp = copperUnion.subtract(drillT)
      manifoldInstancesForCleanup.push(finalOp)
      const threeGeom = manifoldMeshToThreeGeometry(finalOp.getMesh())
      platedHoleCopperGeoms.push({
        key: `ph-${ph.pcb_plated_hole_id || index}`,
        geometry: threeGeom,
        color: COPPER_COLOR,
      })
    }
    // TODO: Handle other plated hole shapes like "pill" if needed for Manifold
  })

  return { platedHoleBoardDrills, platedHoleCopperGeoms }
}
