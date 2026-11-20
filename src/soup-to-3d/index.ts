import { colorize } from "@jscad/modeling/src/colors"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { union } from "@jscad/modeling/src/operations/booleans"
import { cuboid } from "@jscad/modeling/src/primitives"
import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbBoard, PcbPanel } from "circuit-json"
import { createBoardGeomWithOutline } from "../geoms/create-board-with-outline"
import { getBoardEdgeColor } from "../utils/get-board-edge-color"
import { getUnpanelizedBoards } from "../utils/multi-board"

const createSingleBoardGeom = (
  boardOrPanel: PcbBoard | PcbPanel,
  pcbThickness: number,
): Geom3 => {
  if (
    "outline" in boardOrPanel &&
    boardOrPanel.outline &&
    boardOrPanel.outline.length > 0
  ) {
    return createBoardGeomWithOutline(
      {
        outline: boardOrPanel.outline,
      },
      pcbThickness,
    )
  }

  return cuboid({
    size: [boardOrPanel.width ?? 10, boardOrPanel.height ?? 10, pcbThickness],
    center: [boardOrPanel.center.x, boardOrPanel.center.y, 0],
  })
}

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

  let boardsToRender: Array<PcbBoard | PcbPanel> = []
  let board: PcbBoard | undefined
  let pcbThickness = 1.2

  if (panels.length > 0) {
    // Use the panel as the board
    const panel = panels[0]!
    boardsToRender = [panel]
    board = boards.find((b) => b.pcb_panel_id === panel.pcb_panel_id)
    pcbThickness = board?.thickness ?? 1.2
  } else {
    // Skip boards that are inside a panel - only render the panel outline
    const boardsNotInPanel = getUnpanelizedBoards(circuitJson)
    if (boardsNotInPanel.length === 0) {
      console.warn("No pcb_board or pcb_panel found for simplified geometry")
      return []
    }
    boardsToRender = boardsNotInPanel
    board = boardsNotInPanel[0]
    pcbThickness = board?.thickness ?? 1.2
  }

  const geoms = boardsToRender.map((item) =>
    createSingleBoardGeom(item, pcbThickness),
  )
  const boardGeom = geoms.length === 1 ? geoms[0]! : union(...geoms)

  // Colorize and return the simplified board
  const boardEdgeColor = getBoardEdgeColor({
    material: board?.material ?? "fr4",
    solder_mask_color: board?.solder_mask_color,
  })

  return [
    colorize([boardEdgeColor.r, boardEdgeColor.g, boardEdgeColor.b], boardGeom),
  ]
}
