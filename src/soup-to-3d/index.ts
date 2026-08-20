import { colorize } from "@jscad/modeling/src/colors"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { cuboid } from "@jscad/modeling/src/primitives"
import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbBoard, PcbPanel } from "circuit-json"
import { createBoardGeomWithOutline } from "../geoms/create-board-with-outline"
import {
  resolveBoardSoldermaskColor,
  soldermaskColorToJscadRgb,
} from "../utils/soldermask-color"

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
  let pcbThickness = 1.2

  if (panels.length > 0) {
    // Use the panel as the board
    boardOrPanel = panels[0]!
    const firstBoardInPanel = boards.find(
      (b) => b.pcb_panel_id === boardOrPanel!.pcb_panel_id,
    )
    pcbThickness = firstBoardInPanel?.thickness ?? 1.2
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
    pcbThickness = boardOrPanel.thickness ?? 1.2
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
  const boardForColor =
    panels.length > 0
      ? boards.find(
          (board) =>
            board.pcb_panel_id === (boardOrPanel as PcbPanel).pcb_panel_id,
        )
      : (boardOrPanel as PcbBoard)
  const material = soldermaskColorToJscadRgb(
    resolveBoardSoldermaskColor(boardForColor),
  )

  return [colorize(material, boardGeom)]
}
