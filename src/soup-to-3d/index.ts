import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type { AnyCircuitElement, PcbBoard, PcbPanel } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
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
  const materialName =
    "material" in boardOrPanel && boardOrPanel.material
      ? boardOrPanel.material
      : panels.length > 0
        ? (boards.find(
            (b) => b.pcb_panel_id === (boardOrPanel as PcbPanel).pcb_panel_id,
          )?.material ?? "fr4")
        : "fr4"
  const material = boardMaterialColors[materialName] ?? colors.fr4Tan

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
