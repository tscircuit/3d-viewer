import { CadViewer } from "src/CadViewer"

const silkscreenOvalCircuit = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_1",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    thickness: 1,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_1",
    center: { x: 0, y: 0 },
    width: 0,
    height: 0,
    rotation: 0,
    layer: "top",
    obstructs_within_bounds: false,
    do_not_place: true,
  },
  // Oval 1: Stroked, Top Layer
  {
    type: "pcb_silkscreen_oval",
    pcb_silkscreen_oval_id: "oval_1",
    pcb_component_id: "pcb_component_1",
    center: { x: "-2mm", y: "2mm" },
    radius_x: "1.5mm",
    radius_y: "0.8mm",
    stroke_width: "0.2mm",
    layer: "top",
  },
  // Oval 2: Filled, Top Layer
  {
    type: "pcb_silkscreen_oval",
    pcb_silkscreen_oval_id: "oval_2",
    pcb_component_id: "pcb_component_1",
    center: { x: "2mm", y: "2mm" },
    radius_x: "1mm",
    radius_y: "1.5mm",
    layer: "top", // implicit 0 stroke width -> filled
  },
  // Oval 3: Rotated, Bottom Layer (Stroked)
  {
    type: "pcb_silkscreen_oval",
    pcb_silkscreen_oval_id: "oval_3",
    pcb_component_id: "pcb_component_1",
    center: { x: "0mm", y: "-2mm" },
    radius_x: "2mm",
    radius_y: "1mm",
    stroke_width: "0.2mm",
    rotation: 45,
    layer: "bottom",
  },
]

export const SilkscreenOval = () => (
  <CadViewer circuitJson={silkscreenOvalCircuit as any} />
)

export default {
  title: "Silkscreen Oval",
  component: SilkscreenOval,
}
