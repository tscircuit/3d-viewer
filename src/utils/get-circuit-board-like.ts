import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbBoard, PcbPanel } from "circuit-json"

/**
 * Board-like geometry the 3D viewer should frame and texture.
 *
 * Panels are the rendered outline. Using `pcb_board.list()[0]` instead zooms
 * the JSCAD camera onto the first child board and makes the panel look offset.
 */
export function getCircuitBoardLikeForViewer(
  circuitJson: AnyCircuitElement[],
): PcbBoard | null {
  const panels = circuitJson.filter(
    (element): element is PcbPanel => element.type === "pcb_panel",
  )
  const boards = su(circuitJson).pcb_board.list()

  if (panels.length > 0) {
    const panel = panels[0]!
    const firstBoardInPanel = boards.find(
      (board) => board.pcb_panel_id === panel.pcb_panel_id,
    )
    return {
      type: "pcb_board",
      pcb_board_id: panel.pcb_panel_id,
      center: panel.center,
      width: panel.width,
      height: panel.height,
      thickness: firstBoardInPanel?.thickness ?? 1.4,
      material: firstBoardInPanel?.material ?? "fr4",
      num_layers: firstBoardInPanel?.num_layers ?? 2,
      solder_mask_color: firstBoardInPanel?.solder_mask_color,
    } as PcbBoard
  }

  const boardsNotInPanel = boards.filter((board) => !board.pcb_panel_id)
  return boardsNotInPanel[0] ?? null
}
