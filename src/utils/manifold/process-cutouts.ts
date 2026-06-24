import type { ManifoldToplevel, CrossSection } from "manifold-3d"
import type { AnyCircuitElement, PcbCutout } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { SMOOTH_CIRCLE_SEGMENTS } from "../../geoms/constants"
import { extractRectBorderRadius } from "../rect-border-radius"
import { createRoundedRectPrism } from "../pad-geoms"

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

export interface ProcessCutoutsResult {
  cutoutOps: any[]
}

export function processCutoutsForManifold(
  Manifold: ManifoldToplevel["Manifold"],
  CrossSection: ManifoldToplevel["CrossSection"],
  circuitJson: AnyCircuitElement[],
  pcbThickness: number,
  manifoldInstancesForCleanup: any[],
): ProcessCutoutsResult {
  const cutoutOps: any[] = []
  const pcbCutouts = su(circuitJson).pcb_cutout.list()

  for (const cutout of pcbCutouts) {
    let cutoutOp: any
    const cutoutHeight = pcbThickness * 1.5

    switch (cutout.shape) {
      case "rect": {
        const rectCornerRadius = extractRectBorderRadius(cutout)
        if (typeof rectCornerRadius === "number" && rectCornerRadius > 0) {
          cutoutOp = createRoundedRectPrism({
            Manifold,
            width: cutout.width,
            height: cutout.height,
            thickness: cutoutHeight,
            borderRadius: rectCornerRadius,
          })
        } else {
          cutoutOp = Manifold.cube(
            [cutout.width, cutout.height, cutoutHeight],
            true, // centered
          )
        }
        manifoldInstancesForCleanup.push(cutoutOp)
        if (cutout.rotation) {
          const rotatedOp = cutoutOp.rotate([0, 0, cutout.rotation])
          manifoldInstancesForCleanup.push(rotatedOp)
          cutoutOp = rotatedOp
        }
        cutoutOp = cutoutOp.translate([
          cutout.center.x,
          cutout.center.y,
          0, // Centered vertically by Manifold.cube, so Z is 0 for board plane
        ])
        manifoldInstancesForCleanup.push(cutoutOp)
        break
      }
      case "circle":
        cutoutOp = Manifold.cylinder(
          cutoutHeight,
          cutout.radius,
          -1, // default for radiusHigh
          SMOOTH_CIRCLE_SEGMENTS,
          true, // centered
        )
        manifoldInstancesForCleanup.push(cutoutOp)
        cutoutOp = cutoutOp.translate([cutout.center.x, cutout.center.y, 0])
        manifoldInstancesForCleanup.push(cutoutOp)
        break
      case "polygon":
        if (cutout.points.length < 3) {
          console.warn(
            `PCB Cutout [${cutout.pcb_cutout_id}] polygon has fewer than 3 points, skipping.`,
          )
          continue // continue to next cutout
        }
        let pointsVec2: Array<[number, number]> = cutout.points.map((p) => [
          p.x,
          p.y,
        ])
        if (arePointsClockwise(pointsVec2)) {
          pointsVec2 = pointsVec2.reverse()
        }
        const crossSection = CrossSection.ofPolygons([pointsVec2])
        manifoldInstancesForCleanup.push(crossSection)
        cutoutOp = Manifold.extrude(
          crossSection,
          cutoutHeight,
          0, // nDivisions
          0, // twistDegrees
          [1, 1], // scaleTop
          true, // center extrusion
        )
        manifoldInstancesForCleanup.push(cutoutOp)
        break
      default:
        console.warn(
          `Unsupported cutout shape: ${(cutout as any).shape} for cutout ${
            (cutout as PcbCutout).pcb_cutout_id
          }`,
        )
        continue // continue to next cutout
    }
    if (cutoutOp) {
      cutoutOps.push(cutoutOp)
    }
  }

  return { cutoutOps }
}
