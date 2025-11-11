import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { createFauxBoard } from "./create-faux-board"

/**
 * Preprocesses circuit JSON to add a faux board if needed
 * This ensures consistent board processing for both real and faux boards
 */
export function preprocessCircuitJsonWithFauxBoard(
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

  // For faux boards, adjust component z positions to sit on top of the board
  // (same as real boards where components are at boardThickness/2)
  const boardThickness = fauxBoard.thickness
  const componentZ = boardThickness / 2

  const circuitJsonWithOffsetCadElements = circuitJson.map((element) => {
    if (element.type === "cad_component") {
      const cadComponent = element as CadComponent
      if (cadComponent.position) {
        // Set z position to componentZ, preserving x and y
        return {
          ...cadComponent,
          position: {
            ...cadComponent.position,
            z: componentZ,
          },
        }
      }
    }
    return element
  })

  // Add the faux board to the circuit JSON
  return [...processedCircuitJson, fauxBoard]
}
