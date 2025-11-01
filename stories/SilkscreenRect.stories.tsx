import { CadViewer } from "src/CadViewer"

const silkscreenRectCircuit = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_1",
    center: { x: 0, y: 0 },
    width: 10,
    height: 8,
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
    type: "pcb_component",
    pcb_component_id: "pcb_component_bottom",
    center: { x: 0, y: 0 },
    width: 0,
    height: 0,
    rotation: 0,
    layer: "bottom",
    obstructs_within_bounds: false,
    do_not_place: true,
  },
  {
    type: "pcb_silkscreen_rect",
    pcb_silkscreen_rect_id: "pcb_silkscreen_rect_filled",
    pcb_component_id: "pcb_component_1",
    center: { x: -2, y: 1.5 },
    width: "3mm",
    height: "2mm",
    layer: "top",
    stroke_width: "0.15mm",
    corner_radius: "0.4mm",
    is_filled: true,
    has_stroke: false,
  },
  {
    type: "pcb_silkscreen_rect",
    pcb_silkscreen_rect_id: "pcb_silkscreen_rect_stroke",
    pcb_component_id: "pcb_component_1",
    center: { x: 0, y: -1 },
    width: "4mm",
    height: "2.2mm",
    layer: "top",
    stroke_width: "0.2mm",
    corner_radius: "0.5mm",
    is_filled: false,
    has_stroke: true,
  },
  {
    type: "pcb_silkscreen_rect",
    pcb_silkscreen_rect_id: "pcb_silkscreen_rect_bottom",
    pcb_component_id: "pcb_component_bottom",
    center: { x: 0, y: 0 },
    width: "3mm",
    height: "3mm",
    layer: "bottom",
    stroke_width: "0.15mm",
    is_filled: true,
    has_stroke: true,
    corner_radius: "0.6mm",
  },
]

export const SilkscreenRectangles = () => (
  <CadViewer circuitJson={silkscreenRectCircuit as any} />
)

export default {
  title: "Silkscreen Rect",
  component: SilkscreenRectangles,
}
