import type { AnyCircuitElement } from "circuit-json"
import { CadViewer } from "src/CadViewer"

const viaTentingCircuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 24,
    height: 12,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    default_via_tented_on_top: true,
    default_via_tented_on_bottom: false,
  },
  {
    type: "pcb_via",
    pcb_via_id: "inherited",
    x: -7,
    y: 0,
    outer_diameter: 2,
    hole_diameter: 0.8,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_via",
    pcb_via_id: "exposed",
    x: 0,
    y: 0,
    outer_diameter: 2,
    hole_diameter: 0.8,
    layers: ["top", "bottom"],
    tented_on_top: false,
    tented_on_bottom: false,
  },
  {
    type: "pcb_via",
    pcb_via_id: "tented",
    x: 7,
    y: 0,
    outer_diameter: 2,
    hole_diameter: 0.8,
    layers: ["top", "bottom"],
    tented_on_top: true,
    tented_on_bottom: true,
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "board_defaults",
    pcb_component_id: "labels",
    text: "TOP DEFAULT: TENTED / BOTTOM DEFAULT: EXPOSED",
    layer: "top",
    font: "tscircuit2024",
    font_size: 0.8,
    anchor_position: { x: 0, y: 4 },
    anchor_alignment: "center",
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "inherited_label",
    pcb_component_id: "labels",
    text: "INHERITED",
    layer: "top",
    font: "tscircuit2024",
    font_size: 0.8,
    anchor_position: { x: -7, y: -2.5 },
    anchor_alignment: "center",
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "exposed_label",
    pcb_component_id: "labels",
    text: "EXPOSED",
    layer: "top",
    font: "tscircuit2024",
    font_size: 0.8,
    anchor_position: { x: 0, y: -2.5 },
    anchor_alignment: "center",
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "tented_label",
    pcb_component_id: "labels",
    text: "TENTED",
    layer: "top",
    font: "tscircuit2024",
    font_size: 0.8,
    anchor_position: { x: 7, y: -2.5 },
    anchor_alignment: "center",
  },
]

export const BoardDefaultsAndOverrides = () => (
  <div style={{ width: "100vw", height: "100vh" }}>
    <CadViewer circuitJson={viaTentingCircuit} />
  </div>
)

export default {
  title: "Via/Tenting",
  component: BoardDefaultsAndOverrides,
}
