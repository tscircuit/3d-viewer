import type { ManifoldToplevel } from "manifold-3d/manifold.d.ts"
import type { AnyCircuitElement, PcbPlatedHole } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import * as THREE from "three"
import { createCircleHoleDrill, createPlatedHoleDrill } from "../hole-geoms"
import { createRoundedRectPrism } from "../pad-geoms"
import { manifoldMeshToThreeGeometry } from "../manifold-mesh-to-three-geometry"
import {
  colors as defaultColors,
  MANIFOLD_Z_OFFSET,
  SMOOTH_CIRCLE_SEGMENTS,
  DEFAULT_SMT_PAD_THICKNESS,
  M,
} from "../../geoms/constants"
import { extractRectBorderRadius } from "../rect-border-radius"

const COPPER_COLOR = new THREE.Color(...defaultColors.copper)
const PLATED_HOLE_LIP_HEIGHT = 0.05

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

  const createPillOp = (
    width: number,
    height: number,
    depth: number,
  ) => {
    const radius = height / 2
    const rectLength = width - height
    let pillOp: any
    if (rectLength < 1e-9) {
      pillOp = Manifold.cylinder(
        depth,
        radius,
        radius,
        SMOOTH_CIRCLE_SEGMENTS,
        true,
      )
    } else {
      const rect = Manifold.cube([
        Math.max(0, rectLength),
        height,
        depth,
      ], true)
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
      const platedPart = Manifold.cylinder(
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
      const threeGeom = manifoldMeshToThreeGeometry(
        translatedPlatedPart.getMesh(),
      )
      platedHoleCopperGeoms.push({
        key: `ph-${ph.pcb_plated_hole_id || index}`,
        geometry: threeGeom,
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

      // Board Drill
      const drillW = holeW + 2 * MANIFOLD_Z_OFFSET
      const drillH = holeH + 2 * MANIFOLD_Z_OFFSET
      const drillDepth = pcbThickness * 1.2 // Ensure cut-through

      let boardPillDrillOp = createPillOp(drillW, drillH, drillDepth)
      if (shouldRotate) {
        const rotatedOp = boardPillDrillOp.rotate([0, 0, 90]) // Rotate 90 deg around Z
        manifoldInstancesForCleanup.push(rotatedOp)
        boardPillDrillOp = rotatedOp
      }

      if (ph.ccw_rotation) {
        const rotatedOp = boardPillDrillOp.rotate([0, 0, ph.ccw_rotation])
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

      const outerCopperOpUnrotated = createPillOp(
        outerW,
        outerH,
        copperPartThickness,
      )
      const innerDrillOpUnrotated = createPillOp(
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

      if (ph.ccw_rotation) {
        const rotatedOp = finalPlatedPartOp.rotate([0, 0, ph.ccw_rotation])
        manifoldInstancesForCleanup.push(rotatedOp)
        finalPlatedPartOp = rotatedOp
      }

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
    } else if (
      ph.shape === "pill_hole_with_rect_pad" ||
      ph.shape === "rotated_pill_hole_with_rect_pad"
    ) {
      const holeWidthRaw = ph.hole_width!
      const holeHeightRaw = ph.hole_height!
      const shouldRotate = holeHeightRaw > holeWidthRaw

      const holeW = shouldRotate ? holeHeightRaw : holeWidthRaw
      const holeH = shouldRotate ? holeWidthRaw : holeHeightRaw

      const holeRotation =
        ("hole_ccw_rotation" in ph &&
          typeof (ph as any).hole_ccw_rotation === "number"
          ? (ph as any).hole_ccw_rotation
          : undefined) ?? (ph as any).ccw_rotation ?? 0
      const padRotation =
        ("rect_ccw_rotation" in ph &&
          typeof (ph as any).rect_ccw_rotation === "number"
          ? (ph as any).rect_ccw_rotation
          : undefined) ?? (ph as any).ccw_rotation ?? holeRotation
      const rawHoleOffsetX =
        ("hole_offset_x" in ph && typeof ph.hole_offset_x === "number"
          ? ph.hole_offset_x
          : undefined) ??
        ("holeOffsetX" in ph && typeof (ph as any).holeOffsetX === "number"
          ? (ph as any).holeOffsetX
          : undefined) ??
        ("hole_offset" in ph &&
          (ph as any).hole_offset &&
          typeof ((ph as any).hole_offset as any).x === "number"
          ? ((ph as any).hole_offset as any).x
          : undefined) ??
        0
      const rawHoleOffsetY =
        ("hole_offset_y" in ph && typeof ph.hole_offset_y === "number"
          ? ph.hole_offset_y
          : undefined) ??
        ("holeOffsetY" in ph && typeof (ph as any).holeOffsetY === "number"
          ? (ph as any).holeOffsetY
          : undefined) ??
        ("hole_offset" in ph &&
          (ph as any).hole_offset &&
          typeof ((ph as any).hole_offset as any).y === "number"
          ? ((ph as any).hole_offset as any).y
          : undefined) ??
        0
      const holeOffsetX = rawHoleOffsetX ?? 0
      const holeOffsetY = rawHoleOffsetY ?? 0

      const padWidth = ph.rect_pad_width ?? holeW + 0.2
      const padHeight = ph.rect_pad_height ?? holeH + 0.2
      const rectBorderRadius = extractRectBorderRadius(ph)
      const padThickness = DEFAULT_SMT_PAD_THICKNESS

      // Board Drill
      const drillW = holeW + 2 * MANIFOLD_Z_OFFSET
      const drillH = holeH + 2 * MANIFOLD_Z_OFFSET
      const drillDepth = pcbThickness * 1.2

      let boardPillDrillOp = createPillOp(drillW, drillH, drillDepth)
      if (shouldRotate) {
        const rotatedOp = boardPillDrillOp.rotate([0, 0, 90])
        manifoldInstancesForCleanup.push(rotatedOp)
        boardPillDrillOp = rotatedOp
      }

      if (holeRotation) {
        const rotatedOp = boardPillDrillOp.rotate([0, 0, holeRotation])
        manifoldInstancesForCleanup.push(rotatedOp)
        boardPillDrillOp = rotatedOp
      }

      if (holeOffsetX || holeOffsetY) {
        const translatedOp = boardPillDrillOp.translate([
          holeOffsetX,
          holeOffsetY,
          0,
        ])
        manifoldInstancesForCleanup.push(translatedOp)
        boardPillDrillOp = translatedOp
      }

      const translatedBoardPillDrill = boardPillDrillOp.translate([ph.x, ph.y, 0])
      manifoldInstancesForCleanup.push(translatedBoardPillDrill)
      platedHoleBoardDrills.push(translatedBoardPillDrill)

      // Copper Part with rectangular pads
      let copperBarrelOp = createPillOp(
        holeW,
        holeH,
        pcbThickness + 2 * MANIFOLD_Z_OFFSET,
      )

      if (shouldRotate) {
        const rotatedOp = copperBarrelOp.rotate([0, 0, 90])
        manifoldInstancesForCleanup.push(rotatedOp)
        copperBarrelOp = rotatedOp
      }

      if (holeRotation) {
        const rotatedOp = copperBarrelOp.rotate([0, 0, holeRotation])
        manifoldInstancesForCleanup.push(rotatedOp)
        copperBarrelOp = rotatedOp
      }

      if (holeOffsetX || holeOffsetY) {
        const translatedOp = copperBarrelOp.translate([
          holeOffsetX,
          holeOffsetY,
          0,
        ])
        manifoldInstancesForCleanup.push(translatedOp)
        copperBarrelOp = translatedOp
      }

      let topPadOp = createRoundedRectPrism({
        Manifold,
        width: padWidth,
        height: padHeight,
        thickness: padThickness,
        borderRadius: rectBorderRadius,
      })
      manifoldInstancesForCleanup.push(topPadOp)
      let bottomPadOp = createRoundedRectPrism({
        Manifold,
        width: padWidth,
        height: padHeight,
        thickness: padThickness,
        borderRadius: rectBorderRadius,
      })
      manifoldInstancesForCleanup.push(bottomPadOp)

      if (shouldRotate) {
        const rotatedTop = topPadOp.rotate([0, 0, 90])
        manifoldInstancesForCleanup.push(rotatedTop)
        topPadOp = rotatedTop

        const rotatedBottom = bottomPadOp.rotate([0, 0, 90])
        manifoldInstancesForCleanup.push(rotatedBottom)
        bottomPadOp = rotatedBottom
      }

      if (padRotation) {
        const rotatedTop = topPadOp.rotate([0, 0, padRotation])
        manifoldInstancesForCleanup.push(rotatedTop)
        topPadOp = rotatedTop

        const rotatedBottom = bottomPadOp.rotate([0, 0, padRotation])
        manifoldInstancesForCleanup.push(rotatedBottom)
        bottomPadOp = rotatedBottom
      }

      const topPadZ =
        pcbThickness / 2 + padThickness / 2 + MANIFOLD_Z_OFFSET
      const bottomPadZ =
        -pcbThickness / 2 - padThickness / 2 - MANIFOLD_Z_OFFSET

      topPadOp = topPadOp.translate([0, 0, topPadZ])
      manifoldInstancesForCleanup.push(topPadOp)
      bottomPadOp = bottomPadOp.translate([0, 0, bottomPadZ])
      manifoldInstancesForCleanup.push(bottomPadOp)

      const copperUnionBeforeCut = Manifold.union([
        copperBarrelOp,
        topPadOp,
        bottomPadOp,
      ])
      manifoldInstancesForCleanup.push(copperUnionBeforeCut)

      const holeCutWidth = Math.max(
        holeW - 2 * PLATED_HOLE_LIP_HEIGHT,
        0.01,
      )
      const holeCutHeight = Math.max(
        holeH - 2 * PLATED_HOLE_LIP_HEIGHT,
        0.01,
      )
      const holeCutDepth =
        pcbThickness + 2 * padThickness + 4 * MANIFOLD_Z_OFFSET

      let holeCutOp = createPillOp(holeCutWidth, holeCutHeight, holeCutDepth)
      if (shouldRotate) {
        const rotatedOp = holeCutOp.rotate([0, 0, 90])
        manifoldInstancesForCleanup.push(rotatedOp)
        holeCutOp = rotatedOp
      }

      if (holeRotation) {
        const rotatedOp = holeCutOp.rotate([0, 0, holeRotation])
        manifoldInstancesForCleanup.push(rotatedOp)
        holeCutOp = rotatedOp
      }

      if (holeOffsetX || holeOffsetY) {
        const translatedOp = holeCutOp.translate([
          holeOffsetX,
          holeOffsetY,
          0,
        ])
        manifoldInstancesForCleanup.push(translatedOp)
        holeCutOp = translatedOp
      }

      const finalPlatedPartOp = copperUnionBeforeCut.subtract(holeCutOp)
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
      // Board drill uses the actual hole diameter (consistent with JSCAD path)
      const translatedDrill = createCircleHoleDrill({
        Manifold,
        x: ph.x,
        y: ph.y,
        diameter: ph.hole_diameter,
        thickness: pcbThickness,
        segments: SMOOTH_CIRCLE_SEGMENTS,
      })
      manifoldInstancesForCleanup.push(translatedDrill)
      platedHoleBoardDrills.push(translatedDrill)

      // Copper geometry: a barrel ring (outer minus inner) + top/bottom rectangular pads
      const copperPartThickness = pcbThickness + 2 * MANIFOLD_Z_OFFSET

      // Mimic JSCAD behavior: use a cylinder at hole radius, then subtract a slightly smaller one
      const holeRadius = ph.hole_diameter / 2
      const barrelCylinder = Manifold.cylinder(
        copperPartThickness,
        holeRadius,
        holeRadius,
        SMOOTH_CIRCLE_SEGMENTS,
        true,
      )
      manifoldInstancesForCleanup.push(barrelCylinder)

      const padWidth = ph.rect_pad_width ?? ph.hole_diameter
      const padHeight = ph.rect_pad_height ?? ph.hole_diameter
      const rectBorderRadius = extractRectBorderRadius(ph)
      const padThickness = DEFAULT_SMT_PAD_THICKNESS

      const topPad = createRoundedRectPrism({
        Manifold,
        width: padWidth!,
        height: padHeight!,
        thickness: padThickness,
        borderRadius: rectBorderRadius,
      }).translate([
        0,
        0,
        pcbThickness / 2 + padThickness / 2 + MANIFOLD_Z_OFFSET,
      ])
      const bottomPad = createRoundedRectPrism({
        Manifold,
        width: padWidth!,
        height: padHeight!,
        thickness: padThickness,
        borderRadius: rectBorderRadius,
      }).translate([
        0,
        0,
        -pcbThickness / 2 - padThickness / 2 - MANIFOLD_Z_OFFSET,
      ])
      manifoldInstancesForCleanup.push(topPad, bottomPad)

      const copperUnionUncut = Manifold.union([
        barrelCylinder,
        topPad,
        bottomPad,
      ])
      manifoldInstancesForCleanup.push(copperUnionUncut)

      // Subtract actual cylindrical hole through the copper union
      const centerHoleRadius = Math.max(holeRadius - M, 0.01)
      const centerHole = Manifold.cylinder(
        copperPartThickness * 1.1,
        centerHoleRadius,
        centerHoleRadius,
        SMOOTH_CIRCLE_SEGMENTS,
        true,
      )
      manifoldInstancesForCleanup.push(centerHole)
      const copperUnion = copperUnionUncut.subtract(centerHole)
      manifoldInstancesForCleanup.push(copperUnion)

      const translatedCopper = copperUnion.translate([ph.x, ph.y, 0])
      manifoldInstancesForCleanup.push(translatedCopper)

      const threeGeom = manifoldMeshToThreeGeometry(translatedCopper.getMesh())
      platedHoleCopperGeoms.push({
        key: `ph-${ph.pcb_plated_hole_id || index}`,
        geometry: threeGeom,
        color: COPPER_COLOR,
      })
    }
  })

  return { platedHoleBoardDrills, platedHoleCopperGeoms }
}
