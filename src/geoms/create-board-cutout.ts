import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { cuboid } from "@jscad/modeling/src/primitives"
import type { PcbBoard } from "circuit-json"
import { createBoardGeomWithOutline } from "./create-board-with-outline"

export const createBoardCutoutGeom = (
  board: PcbBoard,
  thickness: number,
): Geom3 | null => {
  if (board.outline && board.outline.length > 0) {
    return createBoardGeomWithOutline({ outline: board.outline }, thickness)
  }

  if (board.width == null || board.height == null) {
    return null
  }

  const centerX = board.center?.x ?? 0
  const centerY = board.center?.y ?? 0

  return cuboid({
    size: [board.width, board.height, thickness],
    center: [centerX, centerY, 0],
  })
}
