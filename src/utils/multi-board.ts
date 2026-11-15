import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { calculateOutlineBounds } from "./outline-bounds"

/**
 * Boards that are rendered on their own, i.e. not as part of a panel.
 */
export const getUnpanelizedBoards = (
  circuitJson: AnyCircuitElement[],
): PcbBoard[] =>
  circuitJson.filter(
    (e): e is PcbBoard => e.type === "pcb_board" && !e.pcb_panel_id,
  )

/**
 * A circuit can contain several unpanelized boards, e.g. two `<board />`s in
 * one `<assembly.device />`. The layer textures are one image per layer, so
 * they need one rectangle that covers every board. This returns a board-shaped
 * envelope for that rectangle: the bounds of all boards, no outline, and the
 * first board's stackup. The meshes themselves are still built per board.
 */
export const createMultiBoardEnvelope = (boards: PcbBoard[]): PcbBoard => {
  const first = boards[0]!
  const bounds = boards.map((board) => calculateOutlineBounds(board))
  const minX = Math.min(...bounds.map((b) => b.minX))
  const maxX = Math.max(...bounds.map((b) => b.maxX))
  const minY = Math.min(...bounds.map((b) => b.minY))
  const maxY = Math.max(...bounds.map((b) => b.maxY))
  const { outline: _outline, ...firstWithoutOutline } = first
  return {
    ...firstWithoutOutline,
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    width: maxX - minX,
    height: maxY - minY,
  } as PcbBoard
}
