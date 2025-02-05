import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const createCircuit = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <resistor name="R1" footprint="0805" resistance="10k" pcbX={5} pcbY={5} />
      <resistor
        name="R2"
        footprint="0805"
        resistance="10k"
        pcbX={-5}
        pcbY={5}
      />
      <resistor
        name="R3"
        footprint="0805"
        resistance="10k"
        pcbX={5}
        pcbY={-5}
        layer="bottom"
      />
      <resistor
        name="R4"
        footprint="0805"
        resistance="10k"
        pcbX={-5}
        pcbY={5}
        layer="bottom"
      />
    </board>,
  )

  return circuit.getCircuitJson()
}

export const SmtPadLayersDemo = () => {
  const circuitJson = createCircuit()
  return <CadViewer circuitJson={circuitJson as any} />
}

export default {
  title: "SMT Pad Layers",
  component: SmtPadLayersDemo,
}
