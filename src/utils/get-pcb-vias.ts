import { createBoardOwnerMap, su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbVia } from "circuit-json"

export function getPcbVias(circuitJson: AnyCircuitElement[]): PcbVia[] {
  const boardOwnerMap = createBoardOwnerMap(circuitJson)
  const vias = [...su(circuitJson).pcb_via.list()]

  for (const trace of su(circuitJson).pcb_trace.list()) {
    const board = boardOwnerMap.get(trace.pcb_trace_id)
    for (const [index, point] of trace.route.entries()) {
      if (point.route_type !== "via") continue
      const hasMatchingVia = vias.some(
        (via) =>
          boardOwnerMap.get(via.pcb_via_id) === board &&
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
      boardOwnerMap.set(via.pcb_via_id, board)
    }
  }
  return vias
}
