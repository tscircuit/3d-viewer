import { CadViewer } from "src/CadViewer"
import type { AnyCircuitElement } from "circuit-json"

const createKeepoutCircuit = (
  layers: Array<"top" | "bottom">,
): AnyCircuitElement[] => [
  {
    type: "pcb_board",
    pcb_board_id: "board_1",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    thickness: 1.6,
    material: "fr4",
    num_layers: 2,
  },
  {
    type: "pcb_keepout",
    pcb_keepout_id: `keepout_${layers.join("_")}`,
    shape: "rect",
    center: { x: 0, y: 0 },
    width: 5,
    height: 12,
    layers,
  } as AnyCircuitElement,
]

export const RectKeepout = () => (
  <CadViewer circuitJson={createKeepoutCircuit(["top"])} />
)

export const RectKeepoutBottom = () => (
  <CadViewer circuitJson={createKeepoutCircuit(["bottom"])} />
)

export default {
  title: "Keepout",
  component: RectKeepout,
}
