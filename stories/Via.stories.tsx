import type { AnyCircuitElement } from "circuit-json"
import { CadViewer } from "src/CadViewer"
export default {
  title: "Via",
  component: CadViewer,
}

const viaWithoutBoardCircuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_via",
    pcb_via_id: "via1",
    x: 0,
    y: 0,
    outer_diameter: 1.2,
    hole_diameter: 0.6,
    layers: ["top", "bottom"],
  },
]

export const ViaWithoutBoard = () => (
  <div style={{ width: "100vw", height: "100vh" }}>
    <CadViewer circuitJson={viaWithoutBoardCircuitJson} />
  </div>
)

const multipleViasWithBoardCircuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board1",
    center: { x: 0, y: 0 },
    width: 10,
    height: 5,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_via",
    pcb_via_id: "via1",
    x: -2,
    y: 0,
    outer_diameter: 1.2,
    hole_diameter: 0.6,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_via",
    pcb_via_id: "via2",
    x: 2,
    y: 0,
    outer_diameter: 0.8,
    hole_diameter: 0.4,
    layers: ["top", "bottom"],
  },
]

export const MultipleViasWithBoard = () => (
  <div style={{ width: "100vw", height: "100vh" }}>
    <CadViewer circuitJson={multipleViasWithBoardCircuitJson} />
  </div>
)
