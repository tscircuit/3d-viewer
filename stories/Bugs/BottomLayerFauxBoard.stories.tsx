import { CadViewer } from "src/CadViewer"
import type { AnyCircuitElement } from "circuit-json"

// This story tests bottom layer components with faux board
// by passing circuit JSON directly (simulating no board scenario)

const circuitJsonWithFauxBoard: AnyCircuitElement[] = [
  {
    type: "cad_component",
    cad_component_id: "cad-top",
    pcb_component_id: "pcb-top",
    source_component_id: "src-top",
    position: { x: -5, y: 0, z: 0 },
    layer: "top",
    footprinter_string: "soic8",
  },
  {
    type: "cad_component",
    cad_component_id: "cad-bottom",
    pcb_component_id: "pcb-bottom",
    source_component_id: "src-bottom",
    position: { x: 5, y: 0, z: 0 },
    rotation: { x: 0, y: 180, z: 0 }, // Flipped for bottom layer
    layer: "bottom",
    footprinter_string: "soic8",
  },
]

export const BottomLayerFauxBoard = () => {
  return <CadViewer circuitJson={circuitJsonWithFauxBoard} />
}

export default {
  title: "Bugs/BottomLayerFauxBoard",
  component: BottomLayerFauxBoard,
}
