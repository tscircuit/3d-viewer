import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbBoard, PcbPanel } from "circuit-json"
import { calculateOutlineBounds } from "./outline-bounds"

const EPSILON = 1e-3

export function findBoardsInPanel(
  boards: PcbBoard[],
  panelId: string,
): PcbBoard[] {
  const matched = boards.filter(
    (b) =>
      b.pcb_panel_id === panelId ||
      ((b as { position_mode?: string }).position_mode ===
        "relative_to_panel_anchor" &&
        !b.pcb_panel_id),
  )
  return matched.length > 0 ? matched : boards
}

export function getNormalizedPanelCenter(
  panel: PcbPanel,
  boardsInPanel: PcbBoard[],
): { x: number; y: number } {
  const { width, height, center } = panel
  if (
    !width ||
    !height ||
    boardsInPanel.length === 0 ||
    Math.abs(Math.abs(center.x) - width / 2) > EPSILON ||
    Math.abs(Math.abs(center.y) - height / 2) > EPSILON
  ) {
    return center
  }

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const board of boardsInPanel) {
    const bounds = calculateOutlineBounds(board)
    minX = Math.min(minX, bounds.minX)
    maxX = Math.max(maxX, bounds.maxX)
    minY = Math.min(minY, bounds.minY)
    maxY = Math.max(maxY, bounds.maxY)
  }

  const boardsCenterX = (minX + maxX) / 2
  const boardsCenterY = (minY + maxY) / 2

  if (
    Math.abs(boardsCenterX) <= EPSILON &&
    Math.abs(boardsCenterY) <= EPSILON
  ) {
    return { x: 0, y: 0 }
  }

  return center
}

export function resolveViewerBoardData(
  circuitJson: AnyCircuitElement[],
): PcbBoard | null {
  const panels = circuitJson.filter(
    (e): e is PcbPanel => e.type === "pcb_panel",
  )
  const boards = su(circuitJson).pcb_board.list()

  if (panels.length > 0) {
    const panel = panels[0]!
    const boardsInPanel = findBoardsInPanel(boards, panel.pcb_panel_id)
    const firstBoardInPanel = boardsInPanel[0]
    const center = getNormalizedPanelCenter(panel, boardsInPanel)

    return {
      type: "pcb_board",
      pcb_board_id: panel.pcb_panel_id,
      center,
      width: panel.width,
      height: panel.height,
      thickness: firstBoardInPanel?.thickness ?? panel.thickness ?? 1.4,
      material: firstBoardInPanel?.material ?? "fr4",
      num_layers: firstBoardInPanel?.num_layers ?? 2,
      solder_mask_color: firstBoardInPanel?.solder_mask_color,
    } as PcbBoard
  }

  const boardsNotInPanel = boards.filter((b) => !b.pcb_panel_id)
  return boardsNotInPanel[0] ?? null
}
