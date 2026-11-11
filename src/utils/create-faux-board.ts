import type { AnyCircuitElement, PcbBoard, CadComponent } from "circuit-json"
import { su, getBoundsOfPcbElements } from "@tscircuit/circuit-json-util"

/**
 * Creates a faux PCB board when no board is defined but PCB elements exist
 */
export function createFauxBoard(
  circuitJson: AnyCircuitElement[],
): PcbBoard | null {
  const cadComponents = su(circuitJson)
    .cad_component.list()
    .filter((cad) => cad.pcb_component_id)
  const pcbComponents = su(circuitJson).pcb_component.list()
  const pads = su(circuitJson).pcb_smtpad.list()
  const holes = su(circuitJson).pcb_hole.list()
  const platedHoles = su(circuitJson).pcb_plated_hole.list()
  const vias = su(circuitJson).pcb_via.list()
  const traces = su(circuitJson).pcb_trace.list()
  const cutouts = su(circuitJson).pcb_cutout.list()

  // Check if faux board is needed
  if (
    cadComponents.length === 0 &&
    pcbComponents.length === 0 &&
    pads.length === 0 &&
    holes.length === 0 &&
    platedHoles.length === 0 &&
    vias.length === 0 &&
    traces.length === 0 &&
    cutouts.length === 0
  ) {
    return null
  }

  // Calculate bounding box using the utility function
  const pcbElements = [
    ...pcbComponents,
    ...holes,
    ...platedHoles,
    ...vias,
    ...pads,
    ...traces,
    ...cutouts,
  ]
  const bounds = getBoundsOfPcbElements(pcbElements)

  // Include cad components in bounds calculation
  let minX = bounds.minX
  let maxX = bounds.maxX
  let minY = bounds.minY
  let maxY = bounds.maxY

  for (const component of cadComponents) {
    if (component.position) {
      const x = component.position.x
      const y = component.position.y
      const halfWidth = Math.max((component.size?.x ?? 0) / 2, 0)
      const halfHeight = Math.max((component.size?.y ?? 0) / 2, 0)
      minX = Math.min(minX, x - halfWidth)
      maxX = Math.max(maxX, x + halfWidth)
      minY = Math.min(minY, y - halfHeight)
      maxY = Math.max(maxY, y + halfHeight)
    }
  }

  // Handle case where no valid bounds found
  if (minX === Infinity) {
    minX = -10
    maxX = 10
    minY = -10
    maxY = 10
  }

  // For faux boards, behave like real boards centered at (0,0)
  // Make the board large enough to encompass all components/holes
  const padding = 2 // mm
  const halfWidth = Math.max(Math.abs(minX), Math.abs(maxX)) + padding
  const halfHeight = Math.max(Math.abs(minY), Math.abs(maxY)) + padding
  const width = Math.max(2 * halfWidth, 10) // minimum 10mm
  const height = Math.max(2 * halfHeight, 10) // minimum 10mm

  // Create faux board data like real boards
  const fauxBoard: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "faux-board",
    center: { x: 0, y: 0 }, // Always center at origin like real boards
    width,
    height,
    thickness: 1.4, // standard thickness
    material: "fr4",
    num_layers: 2,
    // No outline - will use rectangular shape
  }

  return fauxBoard
}
