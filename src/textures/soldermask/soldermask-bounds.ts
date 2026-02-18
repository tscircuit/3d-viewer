import type { AnyCircuitElement, PcbBoard, PcbPanel } from "circuit-json"
import { calculateOutlineBounds } from "../../utils/outline-bounds"

const boundsFromPanel = (panel: PcbPanel) => ({
  minX: panel.center.x - panel.width / 2,
  maxX: panel.center.x + panel.width / 2,
  minY: panel.center.y - panel.height / 2,
  maxY: panel.center.y + panel.height / 2,
  width: panel.width,
  height: panel.height,
  centerX: panel.center.x,
  centerY: panel.center.y,
})

const mergeBounds = (
  a: ReturnType<typeof calculateOutlineBounds>,
  b: ReturnType<typeof calculateOutlineBounds>,
) => {
  const minX = Math.min(a.minX, b.minX)
  const maxX = Math.max(a.maxX, b.maxX)
  const minY = Math.min(a.minY, b.minY)
  const maxY = Math.max(a.maxY, b.maxY)
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  }
}

export const getSoldermaskRenderBounds = (
  circuitJson: AnyCircuitElement[],
  boardData: PcbBoard,
) => {
  const panels = circuitJson.filter(
    (e): e is PcbPanel => e.type === "pcb_panel",
  )
  const boards = circuitJson.filter(
    (e): e is PcbBoard => e.type === "pcb_board",
  )

  const activePanel =
    panels.find((panel) => panel.pcb_panel_id === boardData.pcb_board_id) ??
    panels[0]

  if (activePanel && activePanel.width > 0 && activePanel.height > 0) {
    return boundsFromPanel(activePanel)
  }

  const boardsForBounds = boards.length > 1 ? boards : [boardData]

  return boardsForBounds
    .map((board) => calculateOutlineBounds(board))
    .reduce((acc, bounds) => mergeBounds(acc, bounds))
}
