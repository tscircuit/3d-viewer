import type {
  ManifoldToplevel,
  CrossSection as ManifoldCrossSection,
} from "manifold-3d/manifold.d.ts"
import type { PcbBoard } from "circuit-json"
import { arePointsClockwise } from "./geometry-utils"

export interface CreateManifoldBoardResult {
  boardOp: any
  outlineCrossSection: ManifoldCrossSection | null
}

export function createManifoldBoard(
  Manifold: ManifoldToplevel["Manifold"],
  CrossSection: ManifoldToplevel["CrossSection"],
  boardData: PcbBoard,
  pcbThickness: number,
  manifoldInstancesForCleanup: any[],
): CreateManifoldBoardResult {
  let boardOp: any
  let outlineCrossSection: ManifoldCrossSection | null = null

  if (boardData.outline && boardData.outline.length >= 3) {
    let outlineVec2: Array<[number, number]> = boardData.outline.map((p) => [
      p.x,
      p.y,
    ])

    if (arePointsClockwise(outlineVec2)) {
      outlineVec2 = outlineVec2.reverse()
    }

    const crossSection = CrossSection.ofPolygons([outlineVec2])
    manifoldInstancesForCleanup.push(crossSection)
    outlineCrossSection = crossSection

    boardOp = Manifold.extrude(
      crossSection,
      pcbThickness,
      undefined, // nDivisions
      undefined, // twistDegrees
      undefined, // scaleTop
      true, // center (for Z-axis)
    )
    manifoldInstancesForCleanup.push(boardOp)
  } else {
    if (boardData.outline && boardData.outline.length > 0) {
      // Has outline but < 3 points
      console.warn(
        "Board outline has fewer than 3 points, falling back to rectangular board.",
      )
    }
    // Fallback to cuboid if no outline or invalid outline
    boardOp = Manifold.cube(
      [boardData.width!, boardData.height!, pcbThickness],
      true, // center (for all axes)
    )
    manifoldInstancesForCleanup.push(boardOp)
    boardOp = boardOp.translate([boardData.center.x, boardData.center.y, 0])
    manifoldInstancesForCleanup.push(boardOp) // Also track the translated op
  }

  return { boardOp, outlineCrossSection }
}
