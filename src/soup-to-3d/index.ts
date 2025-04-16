import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type { AnyCircuitElement, PCBPlatedHole } from "circuit-json"
import { su } from "@tscircuit/soup-util"
import { translate } from "@jscad/modeling/src/operations/transforms"
import { cuboid, cylinder, line } from "@jscad/modeling/src/primitives"
import { colorize } from "@jscad/modeling/src/colors"
import { subtract, union } from "@jscad/modeling/src/operations/booleans"
import { platedHole } from "../geoms/plated-hole"
import { M, colors } from "../geoms/constants"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { expand } from "@jscad/modeling/src/operations/expansions"
import { createBoardGeomWithOutline } from "../geoms/create-board-with-outline"
import type { Vec2 } from "@jscad/modeling/src/maths/types"
import { createSilkscreenTextGeoms } from "../geoms/create-geoms-for-silkscreen-text"
import type { PcbSilkscreenText } from "circuit-json"

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
  return [colorize(colors.fr4Green, boardGeom)]
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
