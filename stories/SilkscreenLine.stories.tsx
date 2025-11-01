import { CadViewer } from "src/CadViewer"

const silkscreenLineCircuit = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_1",
    center: { x: 0, y: 0 },
    width: 6,
    height: 6,
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
  {
    type: "pcb_silkscreen_line",
    pcb_silkscreen_line_id: "pcb_silkscreen_line_1",
    pcb_component_id: "pcb_component_1",
    stroke_width: "0.1mm",
    x1: "1mm",
    y1: "1mm",
    x2: "2mm",
    y2: "2mm",
    layer: "top",
  },
  {
    type: "pcb_silkscreen_line",
    pcb_silkscreen_line_id: "pcb_silkscreen_line_2",
    pcb_component_id: "pcb_component_1",
    stroke_width: "4mil",
    x1: "1mm",
    y1: "1mm",
    x2: "1mm",
    y2: "2mm",
    layer: "bottom",
  },
]

export const SilkscreenLines = () => (
  <CadViewer circuitJson={silkscreenLineCircuit as any} />
)

export default {
  title: "Silkscreen Line",
  component: SilkscreenLines,
}
