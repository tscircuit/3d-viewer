import { CadViewer } from "src/CadViewer"

const silkscreenCircleCircuit = [
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
    type: "pcb_silkscreen_circle",
    pcb_silkscreen_circle_id: "pcb_silkscreen_circle_top",
    pcb_component_id: "pcb_component_1",
    center: { x: "1mm", y: "1mm" },
    radius: "1.5mm",
    stroke_width: "0.2mm",
    layer: "top",
  },
  {
    type: "pcb_silkscreen_circle",
    pcb_silkscreen_circle_id: "pcb_silkscreen_circle_bottom",
    pcb_component_id: "pcb_component_1",
    center: { x: "-1mm", y: "-1mm" },
    radius: "1mm",
    stroke_width: "4mil",
    layer: "bottom",
  },
]

export const SilkscreenCircles = () => (
  <CadViewer circuitJson={silkscreenCircleCircuit as any} />
)

export default {
  title: "Silkscreen Circle",
  component: SilkscreenCircles,
}


