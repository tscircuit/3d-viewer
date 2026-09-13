import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbPanel } from "circuit-json"

export const DEFAULT_BOARD_THICKNESS = 1.2
export const DEFAULT_PANEL_BOARD_THICKNESS = 1.4

type PcbPanelWithThickness = PcbPanel & { thickness?: number }

/**
 * Thickness used for both the board/panel mesh and CAD placement.
 *
 * Panel meshes already default to 1.4mm. CAD placement used to read the first
 * `pcb_board` (default 1.2mm) and ignore panels, so models sat at the panel
 * midplane when circuit-json emitted z=0.
 */
export function getPcbThicknessFromCircuitJson(
  circuitJson: AnyCircuitElement[] | null | undefined,
): number {
  if (!circuitJson) return DEFAULT_BOARD_THICKNESS

  const panels = circuitJson.filter(
    (element): element is PcbPanelWithThickness => element.type === "pcb_panel",
  )
  const boards = su(circuitJson).pcb_board.list()

  if (panels.length > 0) {
    const panel = panels[0]!
    const firstBoardInPanel = boards.find(
      (board) => board.pcb_panel_id === panel.pcb_panel_id,
    )
    return (
      firstBoardInPanel?.thickness ??
      panel.thickness ??
      DEFAULT_PANEL_BOARD_THICKNESS
    )
  }

  const boardsNotInPanel = boards.filter((board) => !board.pcb_panel_id)
  const board = boardsNotInPanel[0] ?? boards[0]
  return board?.thickness ?? DEFAULT_BOARD_THICKNESS
}
