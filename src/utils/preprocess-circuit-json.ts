import type {
  AnyCircuitElement,
  CadComponent,
  PcbPanel,
  PcbBoard,
} from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { createFauxBoard } from "./create-faux-board"

const DEFAULT_PANEL_THICKNESS = 1.6

/**
 * Adjusts component z-positions when rendering a panel instead of individual boards.
 * Components positioned at z=0 need to be adjusted to sit on the panel surface.
 * This handles the case where @tscircuit/core generates components with z=0
 * (at board center) instead of z=thickness/2 (on board surface).
 */
function adjustComponentsForPanel(
  circuitJson: AnyCircuitElement[],
  panel: PcbPanel,
  boardsInPanel: PcbBoard[],
): AnyCircuitElement[] {
  const panelThickness = DEFAULT_PANEL_THICKNESS
  const panelSurfaceZ = panelThickness / 2

  // Get pcb_components to determine component layer
  const pcbComponents = circuitJson.filter(
    (e) => e.type === "pcb_component",
  ) as any[]

  return circuitJson.map((element) => {
    if (element.type === "cad_component") {
      const cadComponent = element as CadComponent
      if (cadComponent.position) {
        const originalZ = cadComponent.position.z ?? 0

        // Find the corresponding pcb_component to get the layer
        const pcbComponent = pcbComponents.find(
          (pc) => pc.pcb_component_id === cadComponent.pcb_component_id,
        )
        const layer = pcbComponent?.layer ?? "top"
        const isBottomLayer = layer === "bottom"

        // Also check rotation for bottom layer indication
        const isBottomByRotation =
          cadComponent.rotation &&
          Math.abs(Math.abs(cadComponent.rotation.x) - 180) < 1

        const isBottom = isBottomLayer || isBottomByRotation

        // If z is very close to 0, the component needs surface offset
        // If z is already at ~0.8 or ~-0.8, it's already positioned correctly
        const needsZAdjustment = Math.abs(originalZ) < 0.1

        if (needsZAdjustment) {
          // Component is at board center, move it to surface
          const newZ = isBottom ? -panelSurfaceZ : panelSurfaceZ
          return {
            ...cadComponent,
            position: {
              ...cadComponent.position,
              z: newZ,
            },
          }
        }
      }
    }
    return element
  })
}

/**
 * Preprocesses circuit JSON to add a faux board if needed
 * This ensures consistent board processing for both real and faux boards
 */
export function addFauxBoardIfNeeded(
  circuitJson: AnyCircuitElement[],
): AnyCircuitElement[] {
  const boards = su(circuitJson).pcb_board.list()
  const panels = circuitJson.filter((e) => e.type === "pcb_panel") as PcbPanel[]

  // If we have a panel, adjust component z-positions for the panel
  if (panels.length > 0) {
    const panel = panels[0]!
    const boardsInPanel = boards.filter(
      (b) => b.pcb_panel_id === panel.pcb_panel_id,
    )
    return adjustComponentsForPanel(circuitJson, panel, boardsInPanel)
  }

  // If board already exists (and no panel), return as-is
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
    if (element.type === "cad_component") {
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
