import type { AnyCircuitElement } from "circuit-json"

// No components or external models: the decimal board edge is the trigger.
export function rectangularFlexFloat32Boundary(
  axisPadding = 0,
): AnyCircuitElement[] {
  return [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 12,
      height: 8.6,
      thickness: 0.12,
      num_layers: 2,
      material: "flex",
    },
    {
      type: "pcb_bend",
      pcb_bend_id: "bend",
      pcb_board_id: "board",
      start: { x: 0, y: -4.3 - axisPadding },
      end: { x: 0, y: 4.3 + axisPadding },
      bend_radius: 1.21,
      bend_angle: 180,
      bend_side: "right",
    },
  ]
}
