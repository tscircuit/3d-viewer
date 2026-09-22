import { getElementId, su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbBoard, PcbVia } from "circuit-json"

type CircuitJsonId = string

export function getPcbVias(circuitJson: AnyCircuitElement[]): PcbVia[] {
  const elementsById = new Map<CircuitJsonId, AnyCircuitElement>()
  const boardsById = new Map<CircuitJsonId, PcbBoard>()
  const boards = su(circuitJson).pcb_board.list()

  for (const element of circuitJson) {
    elementsById.set(getElementId(element), element)
    if (
      element.type === "source_group" &&
      element.is_subcircuit &&
      element.subcircuit_id
    ) {
      elementsById.set(element.subcircuit_id, element)
    }
  }
  for (const board of boards) {
    boardsById.set(board.pcb_board_id, board)
    if (board.subcircuit_id) boardsById.set(board.subcircuit_id, board)
  }

  const getBoard = (element: AnyCircuitElement): PcbBoard | undefined => {
    let id = getElementId(element)
    const visited = new Set<CircuitJsonId>()
    while (!visited.has(id)) {
      const board = boardsById.get(id)
      if (board) return board
      visited.add(id)
      const owner = elementsById.get(id)
      if (!owner) return undefined

      let parentId: CircuitJsonId | undefined
      switch (owner.type) {
        case "pcb_via":
          parentId =
            owner.subcircuit_id ?? owner.pcb_group_id ?? owner.pcb_trace_id
          break
        case "pcb_trace":
          parentId =
            owner.subcircuit_id ?? owner.pcb_group_id ?? owner.pcb_component_id
          break
        case "pcb_component":
          parentId = owner.subcircuit_id ?? owner.pcb_group_id
          break
        case "pcb_group":
          parentId = owner.subcircuit_id ?? owner.source_group_id
          break
        case "source_group":
          parentId = owner.subcircuit_id
          if (!parentId || parentId === id) {
            parentId =
              owner.parent_subcircuit_id ?? owner.parent_source_group_id
          }
          break
      }
      if (!parentId) return boards.length === 1 ? boards[0] : undefined
      id = parentId
    }
    return undefined
  }

  const vias = [...su(circuitJson).pcb_via.list()]
  const viaBoards = new Map(vias.map((via) => [via, getBoard(via)]))

  for (const trace of su(circuitJson).pcb_trace.list()) {
    const board = getBoard(trace)
    for (const [index, point] of trace.route.entries()) {
      if (point.route_type !== "via") continue
      const hasMatchingVia = vias.some(
        (via) =>
          viaBoards.get(via) === board &&
          via.x === point.x &&
          via.y === point.y &&
          via.layers.includes(point.from_layer) &&
          via.layers.includes(point.to_layer),
      )
      if (hasMatchingVia) continue

      const via: PcbVia = {
        type: "pcb_via",
        pcb_via_id: `${trace.pcb_trace_id}_route_via_${index}`,
        pcb_trace_id: trace.pcb_trace_id,
        subcircuit_id: trace.subcircuit_id,
        pcb_group_id: trace.pcb_group_id,
        x: point.x,
        y: point.y,
        layers: [point.from_layer, point.to_layer],
        hole_diameter:
          point.hole_diameter ?? board?.min_via_hole_diameter ?? 0.25,
        outer_diameter:
          point.outer_diameter ?? board?.min_via_pad_diameter ?? 0.6,
        tented_on_top: point.tented_on_top,
        tented_on_bottom: point.tented_on_bottom,
      }
      vias.push(via)
      viaBoards.set(via, board)
    }
  }
  return vias
}
