import type { AnyCircuitElement, CadComponent, PcbVia } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { createFauxBoard } from "./create-faux-board"

type LegacyPcbVia = Omit<PcbVia, "layers" | "pcb_via_id"> &
  Partial<Pick<PcbVia, "layers" | "pcb_via_id">> & {
    from_layer?: PcbVia["layers"][number]
    to_layer?: PcbVia["layers"][number]
  }

/** Prepare both rendering engines to accept older circuit JSON via records. */
export function preprocessCircuitJson(
  circuitJson: AnyCircuitElement[],
): AnyCircuitElement[] {
  const viaIds = new Set(
    circuitJson.flatMap((element) =>
      element.type === "pcb_via" && element.pcb_via_id
        ? [element.pcb_via_id]
        : [],
    ),
  )
  let changed = false
  const normalized = circuitJson.map((element, index) => {
    if (element.type !== "pcb_via") return element
    const via: LegacyPcbVia = element
    const layers = Array.isArray(via.layers)
      ? via.layers
      : via.from_layer && via.to_layer
        ? [...new Set([via.from_layer, via.to_layer])]
        : undefined
    if (!layers || (layers === via.layers && via.pcb_via_id)) return element

    let id = via.pcb_via_id
    if (!id) {
      id = `pcb_via_legacy_${index}`
      while (viaIds.has(id)) id += "_legacy"
      viaIds.add(id)
    }
    changed = true
    return { ...element, layers, pcb_via_id: id }
  })
  return addFauxBoardIfNeeded(changed ? normalized : circuitJson)
}

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

  // For faux boards, adjust component z positions to sit on top of the board
  // (same as real boards where components are at boardThickness/2)
  const boardThickness = fauxBoard.thickness
  const componentZ = boardThickness / 2

  const processedCircuitJson = circuitJson.map((element) => {
    if (element.type === "cad_component" && element.pcb_component_id) {
      const cadComponent = element as CadComponent
      if (cadComponent.position) {
        const positionZOffset = cadComponent.position.z ?? 0
        // Set z position to componentZ, preserving x and y
        return {
          ...cadComponent,
          position: {
            ...cadComponent.position,
            z: positionZOffset + componentZ,
          },
        }
      }
    }
    return element
  })

  // Add the faux board to the circuit JSON
  return [...processedCircuitJson, fauxBoard]
}
