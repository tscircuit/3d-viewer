import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const atariOutline = [
  { x: -22.5, y: 24.5 },
  { x: 22.5, y: 24.5 },
  { x: 22.5, y: 16.5 },
  { x: 20.5, y: 16.5 },
  { x: 20.5, y: 12.5 },
  { x: 22.5, y: 12.5 },
  { x: 22.5, y: 2.5 },
  { x: 18, y: -1.5 },
  { x: 18, y: -18 },
  { x: -18, y: -18 },
  { x: -18, y: -1.5 },
  { x: -22.5, y: 2.5 },
  { x: -22.5, y: 12.5 },
  { x: -20.5, y: 12.5 },
  { x: -20.5, y: 16.5 },
  { x: -22.5, y: 16.5 },
  { x: -22.5, y: 24.5 },
]

const createCircuit = () => {
  const circuit = new Circuit()
  circuit.add(
    <board width="45mm" height="45mm" outline={atariOutline}>
      <resistor name="R1" footprint="0402" resistance="1k" pcbX={5} pcbY={2} />
      <resistor name="R2" footprint="0402" resistance="1k" pcbX={5} pcbY={0} />
      <trace from={".R1 > .right"} to={".R2 > .left"} />
    </board>,
  )
  return circuit.getCircuitJson()
}

export const AtariBoardOutline = () => {
  const circuitJson = createCircuit()
  return <CadViewer circuitJson={circuitJson as any} />
}

const starOutline = [
  { x: 0, y: 25 },
  { x: 5, y: 15 },
  { x: 15, y: 12.5 },
  { x: 8.5, y: 5 },
  { x: 10, y: -7.5 },
  { x: 0, y: -2.5 },
  { x: -10, y: -7.5 },
  { x: -8.5, y: 5 },
  { x: -15, y: 12.5 },
  { x: -5, y: 15 },
]

const createStarCircuit = () => {
  const circuit = new Circuit()
  circuit.add(
    <board width="30mm" height="30mm" outline={starOutline}>
      <resistor name="R1" footprint="0402" resistance="1k" pcbX={5} pcbY={2} />
      <resistor name="R2" footprint="0402" resistance="1k" pcbX={5} pcbY={0} />
      <trace from={".R1 > .right"} to={".R2 > .left"} />
    </board>,
  )
  return circuit.getCircuitJson()
}

export const StarBoardOutline = () => {
  const circuitJson = createStarCircuit()
  return <CadViewer circuitJson={circuitJson as any} />
}

export default {
  title: "BoardOutline",
  component: AtariBoardOutline,
}
