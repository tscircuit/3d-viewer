import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { createFauxBoard } from "./create-faux-board"

/**
 * Preprocesses circuit JSON to add a faux board if needed
 * This ensures consistent board processing for both real and faux boards
 */
export function addFauxBoardIfNeeded(
  circuitJson: AnyCircuitElement[],
): AnyCircuitElement[] {
  const boards = su(circuitJson).pcb_board.list()

  // If board already exists, return as-is
  if (boards.length > 0) {
    return circuitJson
  }

  // Try to create a faux board
  const fauxBoard = createFauxBoard(circuitJson)

  // If no faux board needed, return as-is
  if (!fauxBoard) {
    return circuitJson
  }

  // For faux boards, adjust component z positions to sit on top/bottom of the board
  // (same as real boards where components are at ±boardThickness/2)
  const boardThickness = fauxBoard.thickness
  const componentZ = boardThickness / 2
  const pcbComponentLayerById = new Map(
    su(circuitJson)
      .pcb_component.list()
      .map((pcbComp) => [pcbComp.pcb_component_id, pcbComp.layer]),
  )

  const processedCircuitJson = circuitJson.map((element) => {
    if (element.type === "cad_component" && element.pcb_component_id) {
      const cadComponent = element as CadComponent
      if (cadComponent.position) {
        const positionZOffset = cadComponent.position.z ?? 0
        const layer =
          cadComponent.layer ??
          (cadComponent.pcb_component_id
            ? pcbComponentLayerById.get(cadComponent.pcb_component_id)
            : undefined)
        const isBottomWithAdjustedRotation =
          layer === "bottom" && Boolean(cadComponent.rotation)
        // Set z position relative to faux board surface, preserving x and y
        return {
          ...cadComponent,
          position: {
            ...cadComponent.position,
            z: isBottomWithAdjustedRotation
              ? positionZOffset - componentZ
              : positionZOffset + componentZ,
          },
        }
      }
    }
    return element
  })

  // Add the faux board to the circuit JSON
  return [...processedCircuitJson, fauxBoard]
}
