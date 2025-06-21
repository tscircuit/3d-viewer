import type {
  ManifoldToplevel,
  Mesh as ManifoldMesh,
} from "manifold-3d/manifold.d.ts"
import type { AnyCircuitElement, PcbPlatedHole } from "circuit-json"
import { su } from "@tscircuit/soup-util"
import * as THREE from "three"
import { createPlatedHoleDrill } from "../hole-geoms"
import {
  colors as defaultColors,
  MANIFOLD_Z_OFFSET,
  SMOOTH_CIRCLE_SEGMENTS,
} from "../../geoms/constants"

const COPPER_COLOR = new THREE.Color(...defaultColors.copper)

export interface ProcessPlatedHolesResult {
  platedHoleBoardDrills: any[]
  platedHoleCopperGeoms: Array<{
    key: string
    geometry: ManifoldMesh
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
    geometry: ManifoldMesh
    color: THREE.Color
  }> = []

  pcbPlatedHoles.forEach((ph: PcbPlatedHole, index: number) => {
    if (ph.shape === "circle") {
      // Board cut for plated holes
      const translatedDrill = createPlatedHoleDrill({
        Manifold,
        x: ph.x,
        y: ph.y,
        outerDiameter: ph.outer_diameter, // Drill for the board
        thickness: pcbThickness,
        zOffset: MANIFOLD_Z_OFFSET,
        segments: SMOOTH_CIRCLE_SEGMENTS,
      })
      manifoldInstancesForCleanup.push(translatedDrill)
      platedHoleBoardDrills.push(translatedDrill)

      // Copper part of plated holes
      const copperPartThickness = pcbThickness + 2 * MANIFOLD_Z_OFFSET
      let platedPart = Manifold.cylinder(
        copperPartThickness,
        ph.outer_diameter / 2,
        ph.outer_diameter / 2,
        SMOOTH_CIRCLE_SEGMENTS,
        true,
      )
      manifoldInstancesForCleanup.push(platedPart)
      const drillForCopper = Manifold.cylinder(
        copperPartThickness * 1.05, // ensure it cuts through
        ph.hole_diameter / 2,
        ph.hole_diameter / 2,
        SMOOTH_CIRCLE_SEGMENTS,
        true,
      )
      manifoldInstancesForCleanup.push(drillForCopper)
      const finalPlatedPartOp = platedPart.subtract(drillForCopper)
      manifoldInstancesForCleanup.push(finalPlatedPartOp)
      const translatedPlatedPart = finalPlatedPartOp.translate([ph.x, ph.y, 0])
      manifoldInstancesForCleanup.push(translatedPlatedPart)
      platedHoleCopperGeoms.push({
        key: `ph-${ph.pcb_plated_hole_id || index}`,
        geometry: translatedPlatedPart.getMesh(),
        color: COPPER_COLOR,
      })
    } else if (ph.shape === "pill") {
      const holeWidthRaw = ph.hole_width!
      const holeHeightRaw = ph.hole_height!
      const shouldRotate = holeHeightRaw > holeWidthRaw

      const holeW = shouldRotate ? holeHeightRaw : holeWidthRaw
      const holeH = shouldRotate ? holeWidthRaw : holeHeightRaw

      const defaultPadExtension = 0.4 // 0.2mm pad extension per side
      const outerW = shouldRotate
        ? (ph.outer_height ?? holeH + defaultPadExtension / 2)
        : (ph.outer_width ?? holeW + defaultPadExtension / 2)
      const outerH = shouldRotate
        ? (ph.outer_width ?? holeW + defaultPadExtension / 2)
        : (ph.outer_height ?? holeH + defaultPadExtension / 2)

      const createPill = (width: number, height: number, depth: number) => {
        const radius = height / 2
        const rectLength = width - height
        let pillOp
        if (rectLength < 1e-9) {
          // Primarily cylindrical
          pillOp = Manifold.cylinder(
            depth,
            radius,
            radius,
            SMOOTH_CIRCLE_SEGMENTS,
            true,
          )
        } else {
          const rect = Manifold.cube(
            [Math.max(0, rectLength), height, depth],
            true,
          )
          const cap1 = Manifold.cylinder(
            depth,
            radius,
            radius,
            SMOOTH_CIRCLE_SEGMENTS,
            true,
          ).translate([-rectLength / 2, 0, 0])
          const cap2 = Manifold.cylinder(
            depth,
            radius,
            radius,
            SMOOTH_CIRCLE_SEGMENTS,
            true,
          ).translate([rectLength / 2, 0, 0])
          pillOp = Manifold.union([rect, cap1, cap2])
          manifoldInstancesForCleanup.push(rect, cap1, cap2)
        }
        manifoldInstancesForCleanup.push(pillOp)
        return pillOp
      }

      // Board Drill
      const drillW = holeW + 2 * MANIFOLD_Z_OFFSET
      const drillH = holeH + 2 * MANIFOLD_Z_OFFSET
      const drillDepth = pcbThickness * 1.2 // Ensure cut-through

      let boardPillDrillOp = createPill(drillW, drillH, drillDepth)
      if (shouldRotate) {
        const rotatedOp = boardPillDrillOp.rotate([0, 0, 90]) // Rotate 90 deg around Z
        manifoldInstancesForCleanup.push(rotatedOp)
        boardPillDrillOp = rotatedOp
      }
      const translatedBoardPillDrill = boardPillDrillOp.translate([
        ph.x,
        ph.y,
        0,
      ])
      manifoldInstancesForCleanup.push(translatedBoardPillDrill)
      platedHoleBoardDrills.push(translatedBoardPillDrill)

      // Copper Part
      const copperPartThickness = pcbThickness + 2 * MANIFOLD_Z_OFFSET

      const outerCopperOpUnrotated = createPill(
        outerW,
        outerH,
        copperPartThickness,
      )
      const innerDrillOpUnrotated = createPill(
        holeW,
        holeH,
        copperPartThickness * 1.05, // Make drill slightly thicker to ensure cut
      )

      let finalPlatedPartOp = outerCopperOpUnrotated.subtract(
        innerDrillOpUnrotated,
      )
      manifoldInstancesForCleanup.push(finalPlatedPartOp)

      if (shouldRotate) {
        const rotatedOp = finalPlatedPartOp.rotate([0, 0, 90])
        manifoldInstancesForCleanup.push(rotatedOp)
        finalPlatedPartOp = rotatedOp
      }

      const translatedPlatedPart = finalPlatedPartOp.translate([ph.x, ph.y, 0])
      manifoldInstancesForCleanup.push(translatedPlatedPart)

      platedHoleCopperGeoms.push({
        key: `ph-${ph.pcb_plated_hole_id || index}`,
        geometry: translatedPlatedPart.getMesh(),
        color: COPPER_COLOR,
      })
    }
  })

  return { platedHoleBoardDrills, platedHoleCopperGeoms }
}
