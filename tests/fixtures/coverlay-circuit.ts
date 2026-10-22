import type { CircuitJson, PcbBoard } from "circuit-json"

export function createCoverlayCircuit(
  coverlayColor: PcbBoard["coverlay_color"],
): CircuitJson {
  return [
    {
      type: "pcb_board",
      pcb_board_id: "board", subcircuit_id: "flex",
      material: "flex",
      coverlay_color: coverlayColor,
      center: { x: 0, y: 0 },
      width: 12,
      height: 8,
      thickness: 0.1,
      num_layers: 2,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "left",
      shape: "rect",
      layer: "top",
      x: -4,
      y: 0,
      width: 2,
      height: 2,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "right",
      shape: "rect",
      layer: "top",
      x: 4,
      y: 0,
      width: 2,
      height: 2,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "bottom_left",
      shape: "rect",
      layer: "bottom",
      x: -4,
      y: 0,
      width: 2,
      height: 2,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "bottom_right",
      shape: "rect",
      layer: "bottom",
      x: 4,
      y: 0,
      width: 2,
      height: 2,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace",
      route: [
        { route_type: "wire", x: -4, y: 0, width: 0.5, layer: "top" },
        { route_type: "wire", x: 4, y: 0, width: 0.5, layer: "top" },
      ],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "bottom_trace",
      route: [
        { route_type: "wire", x: -4, y: 0, width: 0.5, layer: "bottom" },
        { route_type: "wire", x: 4, y: 0, width: 0.5, layer: "bottom" },
      ],
    },
    {
      type: "pcb_soldermask_opening",
      pcb_soldermask_opening_id: "window",
      subcircuit_id: "flex",
      layer: "top",
      shape: "rect",
      x: 0,
      y: -2,
      width: 3,
      height: 1,
    },
  ]
}
