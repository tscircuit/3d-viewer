import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type { AnyCircuitElement } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { cuboid } from "@jscad/modeling/src/primitives"
import { subtract } from "@jscad/modeling/src/operations/booleans"
import { colorize } from "@jscad/modeling/src/colors"
import {
  colors,
  boardMaterialColors,
  tracesMaterialColors,
} from "../geoms/constants"
import { createBoardGeomWithOutline } from "../geoms/create-board-with-outline"
import { createBoardCutoutGeom } from "../geoms/create-board-cutout"

/**
 * Creates a simplified board geometry (just the board shape, no components/holes).
 * Used for initial display while the detailed geometry is being built.
 */
export const createSimplifiedBoardGeom = (
  circuitJson: AnyCircuitElement[],
): Geom3[] => {
  const soup = su(circuitJson)
  const boards = soup.pcb_board.list()
  const panels = soup.pcb_panel?.list?.() ?? []

  const geoms: Geom3[] = []

  if (panels.length > 0) {
    const panelThickness = boards[0]?.thickness ?? 1.6
    const boardCutoutGeoms = boards
      .map((pcbBoard) => createBoardCutoutGeom(pcbBoard, panelThickness))
      .filter((geom): geom is Geom3 => geom !== null)

    for (const panel of panels) {
      if (panel.width == null || panel.height == null) continue

      const panelGeom = cuboid({
        size: [panel.width, panel.height, panelThickness],
        center: [0, 0, 0],
      })
      const cutPanelGeom =
        boardCutoutGeoms.length > 0
          ? subtract(panelGeom, ...boardCutoutGeoms)
          : panelGeom
      const panelColor = panel.covered_with_solder_mask
        ? colors.fr4GreenSolderWithMask
        : colors.fr4Green
      geoms.push(colorize(panelColor, cutPanelGeom))
    }
  }

  if (boards.length === 0) {
    if (geoms.length === 0) {
      console.warn("No pcb_board or pcb_panel found for simplified geometry")
    }
    return geoms
  }

  for (const board of boards) {
    const pcbThickness = board.thickness ?? 1.2
    let boardGeom: Geom3 | null = null

    if (board.outline && board.outline.length > 0) {
      boardGeom = createBoardGeomWithOutline(
        {
          outline: board.outline!,
        },
        pcbThickness,
      )
    } else if (board.width != null && board.height != null) {
      boardGeom = cuboid({
        size: [board.width, board.height, pcbThickness],
        center: [board.center?.x ?? 0, board.center?.y ?? 0, 0],
      })
    }

    if (!boardGeom) continue

    const material = boardMaterialColors[board.material] ?? colors.fr4Green
    geoms.push(colorize(material, boardGeom))
  }

  return geoms
}

/**
 * @deprecated Use BoardGeomBuilder for detailed geometry or createSimplifiedBoardGeom for initial display.
 */
export const createBoardGeomFromCircuitJson = (
  circuitJson: AnyCircuitElement[],
  opts: {
    simplifiedBoard?: boolean
  } = {},
): Geom3[] => {
  console.warn(
    "createBoardGeomFromCircuitJson is deprecated. Use BoardGeomBuilder or createSimplifiedBoardGeom.",
  )
  if (opts.simplifiedBoard) {
    return createSimplifiedBoardGeom(circuitJson)
  }
  // For non-simplified, we ideally shouldn't reach here in the new flow.
  // Return simplified as a fallback for now.
  return createSimplifiedBoardGeom(circuitJson)
}
