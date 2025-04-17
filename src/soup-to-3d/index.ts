import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type { AnyCircuitElement } from "circuit-json"
import { su } from "@tscircuit/soup-util"
import { cuboid } from "@jscad/modeling/src/primitives"
import { colorize } from "@jscad/modeling/src/colors"
import {
  colors,
  boardMaterialColors,
  tracesMaterialColors,
} from "../geoms/constants"
import { createBoardGeomWithOutline } from "../geoms/create-board-with-outline"

/**
 * Creates a simplified board geometry (just the board shape, no components/holes).
 * Used for initial display while the detailed geometry is being built.
 */
export const createSimplifiedBoardGeom = (
  circuitJson: AnyCircuitElement[],
): Geom3[] => {
  const board = su(circuitJson).pcb_board.list()[0]
  if (!board) {
    console.warn("No pcb_board found for simplified geometry")
    return []
  }

  let boardGeom: Geom3
  const pcbThickness = 1.2 // TODO: Get from board if available

  if (board.outline && board.outline.length > 0) {
    boardGeom = createBoardGeomWithOutline(
      {
        center: board.center,
        outline: board.outline!,
      },
      pcbThickness,
    )
  } else {
    boardGeom = cuboid({
      size: [board.width, board.height, pcbThickness],
      center: [board.center.x, board.center.y, 0],
    })
  }

  // Colorize and return the simplified board
  const material = boardMaterialColors[board.material] ?? colors.fr4Green

  return [colorize(material, boardGeom)]
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
