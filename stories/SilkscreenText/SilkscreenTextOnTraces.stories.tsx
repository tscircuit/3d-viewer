import { CadViewer } from "src/CadViewer"
import { Circuit, SilkscreenText } from "@tscircuit/core"

const createCircuit = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <resistor
        name="R1"
        footprint="0805"
        resistance="10k"
        pcbX={10}
        pcbY={0}
      />
      <resistor
        name="R2"
        footprint="0805"
        resistance="10k"
        pcbX={-10}
        pcbY={0}
      />
      <resistor
        name="R3"
        footprint="0805"
        resistance="10k"
        pcbX={0}
        pcbY={-10}
      />
      <resistor
        name="R4"
        footprint="0805"
        resistance="10k"
        pcbX={0}
        pcbY={10}
      />
      <trace from={".R1 > .right"} to={".R2 > .left"} />
      <trace from={".R4 > .right"} to={".R3 > .left"} />
      <footprint>
        <silkscreentext text="Tscircuit" pcbX={0} pcbY={1.6} />
      </footprint>
    </board>,
  )

  return circuit.getCircuitJson()
}

export const SilkscreenTextOnTraces = () => {
  const circuitJson = createCircuit()
  return <CadViewer soup={circuitJson as any} />
}

export default {
  title: "Silkscreen Text",
  component: SilkscreenTextOnTraces,
}
