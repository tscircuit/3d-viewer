import type { AnyCircuitElement } from "circuit-json"
import { CadViewer } from "src/CadViewer"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 14,
    height: 10,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  ...(["top", "bottom"] as const).flatMap((layer): AnyCircuitElement[] => [
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: `pad-${layer}`,
      pcb_component_id: "component",
      shape: "rect",
      x: 0,
      y: 0,
      width: 5,
      height: 4,
      layer,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: `trace-${layer}`,
      route: [
        { route_type: "wire", x: -6, y: -3, width: 1, layer },
        { route_type: "wire", x: 0, y: 0, width: 1, layer },
        { route_type: "wire", x: 6, y: 3, width: 1, layer },
      ],
    },
  ]),
]

export const TraceAcrossExposedPad = () => (
  <CadViewer circuitJson={circuitJson} autoRotateDisabled />
)

export default { title: "Bugs/Trace Across Exposed Pad" }
