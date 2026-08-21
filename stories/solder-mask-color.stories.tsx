import { Circuit } from "@tscircuit/core"
import { CadViewer } from "src/CadViewer"

type PcbColor =
  | "green"
  | "purple"
  | "red"
  | "yellow"
  | "blue"
  | "white"
  | "black"

const createColorBoardCircuit = (color: PcbColor) => {
  const circuit = new Circuit()
  circuit.add(
    <board width="20mm" height="20mm" solderMaskColor={color}>
      <resistor name="R1" footprint="0402" resistance="1k" pcbX={0} pcbY={0} />
    </board>,
  )
  return circuit.getCircuitJson()
}

const ColorBoard = ({ color }: { color: PcbColor }) => (
  <CadViewer circuitJson={createColorBoardCircuit(color) as any} />
)

export const GreenSolderMask = () => <ColorBoard color="green" />
export const PurpleSolderMask = () => <ColorBoard color="purple" />
export const RedSolderMask = () => <ColorBoard color="red" />
export const YellowSolderMask = () => <ColorBoard color="yellow" />
export const BlueSolderMask = () => <ColorBoard color="blue" />
export const WhiteSolderMask = () => <ColorBoard color="white" />
export const BlackSolderMask = () => <ColorBoard color="black" />

export default {
  title: "SolderMaskColor",
  component: BlueSolderMask,
}
