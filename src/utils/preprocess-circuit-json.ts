import type {
  AnyCircuitElement,
  CadComponent,
  PcbComponent,
  PcbPanel,
} from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { createFauxBoard } from "./create-faux-board"
import {
  findBoardsInPanel,
  getNormalizedPanelCenter,
} from "./resolve-panel-board-data"

export function normalizePanelCircuitJson(
  circuitJson: AnyCircuitElement[],
): AnyCircuitElement[] {
  const panels = circuitJson.filter(
    (e): e is PcbPanel => e.type === "pcb_panel",
  )
  if (panels.length === 0) {
    return circuitJson
  }

  const boards = su(circuitJson).pcb_board.list()
  const pcbComponentById = new Map<string, PcbComponent>()
  for (const element of circuitJson) {
    if (element.type === "pcb_component") {
      pcbComponentById.set(element.pcb_component_id, element)
    }
  }

  const normalizedCenterByPanelId = new Map<string, { x: number; y: number }>()
  for (const panel of panels) {
    const boardsInPanel = findBoardsInPanel(boards, panel.pcb_panel_id)
    normalizedCenterByPanelId.set(
      panel.pcb_panel_id,
      getNormalizedPanelCenter(panel, boardsInPanel),
    )
  }

  let changed = false
  const mapped = circuitJson.map((element) => {
    if (element.type === "pcb_panel") {
      const normalizedCenter = normalizedCenterByPanelId.get(
        element.pcb_panel_id,
      )
      if (
        normalizedCenter &&
        (normalizedCenter.x !== element.center.x ||
          normalizedCenter.y !== element.center.y)
      ) {
        changed = true
        return {
          ...element,
          center: normalizedCenter,
        }
      }
      return element
    }

    if (element.type === "cad_component" && element.pcb_component_id) {
      const cadComponent = element as CadComponent & {
        model_origin_position?: { x: number; y: number; z: number }
      }
      const pcbComponent = pcbComponentById.get(element.pcb_component_id)
      if (
        pcbComponent?.center &&
        cadComponent.position &&
        !cadComponent.model_origin_position
      ) {
        const dx = Math.abs(cadComponent.position.x - pcbComponent.center.x)
        const dy = Math.abs(cadComponent.position.y - pcbComponent.center.y)
        if (dx > 1e-4 || dy > 1e-4) {
          changed = true
          return {
            ...cadComponent,
            position: {
              ...cadComponent.position,
              x: pcbComponent.center.x,
              y: pcbComponent.center.y,
            },
          }
        }
      }
    }

    return element
  })

  return changed ? mapped : circuitJson
}

/**
 * Preprocesses circuit JSON to add a faux board if needed
 * This ensures consistent board processing for both real and faux boards
 */
export function addFauxBoardIfNeeded(
  circuitJson: AnyCircuitElement[],
): AnyCircuitElement[] {
  const normalizedCircuitJson = normalizePanelCircuitJson(circuitJson)
  const boards = su(normalizedCircuitJson).pcb_board.list()

  // If board already exists, return as-is
  if (boards.length > 0) {
    return normalizedCircuitJson
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
