import { CadViewer } from "src/CadViewer"
import type { AnyCircuitElement } from "circuit-json"

const createSilkscreenRectCircuit = (): AnyCircuitElement[] => {
  return [
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

    // Filled rectangle (top)
    {
      type: "pcb_silkscreen_rect",
      pcb_silkscreen_rect_id: "pcb_silkscreen_rect_filled",
      pcb_component_id: "pcb_component_1",
      center: { x: -2, y: 1.5 },
      width: 3,
      height: 2,
      layer: "top",
      stroke_width: 0.15,
      corner_radius: 0.4,
      is_filled: true,
      has_stroke: false,
    },

    // Stroke-only rectangle (top)
    {
      type: "pcb_silkscreen_rect",
      pcb_silkscreen_rect_id: "pcb_silkscreen_rect_stroke",
      pcb_component_id: "pcb_component_1",
      center: { x: 0, y: -1 },
      width: 4,
      height: 2.2,
      layer: "top",
      stroke_width: 0.2,
      corner_radius: 0.5,
      is_filled: false,
      has_stroke: true,
    },

    // Filled + stroke rectangle (bottom)
    {
      type: "pcb_silkscreen_rect",
      pcb_silkscreen_rect_id: "pcb_silkscreen_rect_bottom",
      pcb_component_id: "pcb_component_1",
      center: { x: 0, y: 0 },
      width: 3,
      height: 3,
      layer: "bottom",
      stroke_width: 0.15,
      corner_radius: 0.6,
      is_filled: true,
      has_stroke: true,
    },
  ]
}

export const SilkscreenRectangles = () => {
  const circuitJson = createSilkscreenRectCircuit()
  return <CadViewer circuitJson={circuitJson} />
}

export default {
  title: "Silkscreen Rect",
  component: SilkscreenRectangles,
}
