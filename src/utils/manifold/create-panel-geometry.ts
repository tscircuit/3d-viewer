import type {
  ManifoldToplevel,
  CrossSection as ManifoldCrossSection,
} from "manifold-3d/manifold.d.ts"
import type { PcbBoard } from "circuit-json"
import { arePointsClockwise } from "./geometry-utils"

export interface PanelData {
  width: number
  height: number
  center?: { x: number; y: number }
}

export interface CreatePanelGeometryResult {
  panelOp: any
}

export function createPanelGeometry(
  Manifold: ManifoldToplevel["Manifold"],
  CrossSection: ManifoldToplevel["CrossSection"],
  panelData: PanelData,
  boards: PcbBoard[],
  panelThickness: number,
  manifoldInstancesForCleanup: any[],
): CreatePanelGeometryResult {
  // Create base panel (centered at origin)
  let panelOp = Manifold.cube(
    [panelData.width, panelData.height, panelThickness],
    true, // centered
  )
  manifoldInstancesForCleanup.push(panelOp)

  // Translate panel to its center if specified
  if (panelData.center) {
    const translatedPanel = panelOp.translate([
      panelData.center.x,
      panelData.center.y,
      0,
    ])
    manifoldInstancesForCleanup.push(translatedPanel)
    panelOp = translatedPanel
  }

  // Create cutouts for each board
  // Empty panel (no boards) is valid - just return solid panel
  const boardCutouts: any[] = []

  for (const board of boards) {
    let cutout: any
    const cutoutDepth = panelThickness * 1.5 // Cut through completely

    if (board.outline && board.outline.length >= 3) {
      // Polygon cutout
      // Board outline points are relative to board center (0,0),
      // so we translate the entire cutout to the board's absolute position
      let points: Array<[number, number]> = board.outline.map((p) => [p.x, p.y])
      if (arePointsClockwise(points)) {
        points = points.reverse()
      }
      const cs = CrossSection.ofPolygons([points])
      manifoldInstancesForCleanup.push(cs)
      cutout = Manifold.extrude(
        cs,
        cutoutDepth,
        undefined, // nDivisions
        undefined, // twistDegrees
        undefined, // scaleTop
        true, // center extrusion
      )
      manifoldInstancesForCleanup.push(cutout)

      // Translate to board center
      const translatedCutout = cutout.translate([
        board.center.x,
        board.center.y,
        0,
      ])
      manifoldInstancesForCleanup.push(translatedCutout)
      cutout = translatedCutout
    } else {
      // Rectangular cutout
      cutout = Manifold.cube(
        [board.width!, board.height!, cutoutDepth],
        true, // centered
      )
      manifoldInstancesForCleanup.push(cutout)

      // Translate to board center
      const translatedCutout = cutout.translate([
        board.center.x,
        board.center.y,
        0,
      ])
      manifoldInstancesForCleanup.push(translatedCutout)
      cutout = translatedCutout
    }

    boardCutouts.push(cutout)
  }

  // Subtract all cutouts from panel
  if (boardCutouts.length > 0) {
    const unionedCutouts = Manifold.union(boardCutouts)
    manifoldInstancesForCleanup.push(unionedCutouts)
    const finalPanel = panelOp.subtract(unionedCutouts)
    manifoldInstancesForCleanup.push(finalPanel)
    panelOp = finalPanel
  }

  return { panelOp }
}
