import { CadViewer } from "src/CadViewer"
import type { AnyCircuitElement } from "circuit-json"

const createSilkscreenLineCircuit = (): AnyCircuitElement[] => {
  return [
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
      type: "pcb_silkscreen_line",
      pcb_silkscreen_line_id: "pcb_silkscreen_line_top",
      pcb_component_id: "pcb_component_1",
      stroke_width: 0.1,
      x1: 1,
      y1: 1,
      x2: 2,
      y2: 2,
      layer: "top",
    },
    {
      type: "pcb_silkscreen_line",
      pcb_silkscreen_line_id: "pcb_silkscreen_line_bottom",
      pcb_component_id: "pcb_component_1",
      stroke_width: 0.1016,
      x1: 1,
      y1: 1,
      x2: 1,
      y2: 2,
      layer: "bottom",
    },
  ]
}

export const SilkscreenLines = () => {
  const circuitJson = createSilkscreenLineCircuit()
  return <CadViewer circuitJson={circuitJson} />
}

export default {
  title: "Silkscreen Line",
  component: SilkscreenLines,
}
