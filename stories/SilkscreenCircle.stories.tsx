import { CadViewer } from "src/CadViewer"
import type { AnyCircuitElement } from "circuit-json"

const createSilkscreenCircleCircuit = (): AnyCircuitElement[] => {
  return [
    {
      type: "pcb_board",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      subcircuit_id: "pcb_generic_component_0",
      material: "fr4",
      num_layers: 2,
      pcb_board_id: "pcb_board_0",
      thickness: 1,
      is_subcircuit: false,
    },
    {
      type: "pcb_silkscreen_circle",
      pcb_silkscreen_circle_id: "pcb_silkscreen_circle_top",
      pcb_component_id: "pcb_component_1",
      center: { x: 1, y: 1 },
      radius: 1.5,
      stroke_width: 0.2,
      layer: "top",
    },
    {
      type: "pcb_silkscreen_circle",
      pcb_silkscreen_circle_id: "pcb_silkscreen_circle_bottom",
      pcb_component_id: "pcb_component_1",
      center: { x: -1, y: -1 },
      radius: 1,
      stroke_width: 0.1016,
      layer: "bottom",
    },
  ]
}

export const SilkscreenCircles = () => {
  const circuitJson = createSilkscreenCircleCircuit()
  return <CadViewer circuitJson={circuitJson} />
}

export default {
  title: "Silkscreen Circle",
  component: SilkscreenCircles,
}
