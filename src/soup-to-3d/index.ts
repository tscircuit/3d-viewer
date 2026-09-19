import { colorize } from "@jscad/modeling/src/colors"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { cuboid } from "@jscad/modeling/src/primitives"
import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbBoard, PcbPanel } from "circuit-json"
import { createBoardGeomWithOutline } from "../geoms/create-board-with-outline"
import { getBoardEdgeColor } from "../utils/get-board-edge-color"
import { getPcbThicknessFromCircuitJson } from "../utils/get-pcb-thickness"

/**
 * Creates a simplified board geometry (just the board shape, no components/holes).
 * Used for initial display while the detailed geometry is being built.
 */
export const createSimplifiedBoardGeom = (
  circuitJson: AnyCircuitElement[],
): Geom3[] => {
  // Check for panel first
  const panels = circuitJson.filter(
    (e): e is PcbPanel => e.type === "pcb_panel",
  )
  const boards = su(circuitJson).pcb_board.list()

  let boardOrPanel: PcbBoard | PcbPanel | undefined
  let board: PcbBoard | undefined
  const pcbThickness = getPcbThicknessFromCircuitJson(circuitJson)

  if (panels.length > 0) {
    // Use the panel as the board
    boardOrPanel = panels[0]!
    board = boards.find((b) => b.pcb_panel_id === boardOrPanel!.pcb_panel_id)
  } else {
    // Skip boards that are inside a panel - only render the panel outline
    const boardsNotInPanel = boards.filter(
      (b): b is PcbBoard => !b.pcb_panel_id,
    )
    boardOrPanel = boardsNotInPanel[0]
    if (!boardOrPanel) {
      console.warn("No pcb_board or pcb_panel found for simplified geometry")
      return []
    }
    board = boardOrPanel
  }

  let boardGeom: Geom3

  if (
    "outline" in boardOrPanel &&
    boardOrPanel.outline &&
    boardOrPanel.outline.length > 0
  ) {
    boardGeom = createBoardGeomWithOutline(
      {
        outline: boardOrPanel.outline,
      },
      pcbThickness,
    )
  } else {
    boardGeom = cuboid({
      size: [boardOrPanel.width ?? 10, boardOrPanel.height ?? 10, pcbThickness],
      center: [boardOrPanel.center.x, boardOrPanel.center.y, 0],
    })
  }

  // Colorize and return the simplified board
  const boardEdgeColor = getBoardEdgeColor({
    material: board?.material ?? "fr4",
    solder_mask_color: board?.solder_mask_color,
  })

  return [
    colorize([boardEdgeColor.r, boardEdgeColor.g, boardEdgeColor.b], boardGeom),
  ]
}
