import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const createCircuit = () => {
  const circuit = new Circuit()
  circuit.add(
    <board width="10mm" height="10mm">
      <resistor
        resistance="1k"
        footprint="kicad:Resistor_SMD/R_0402_1005Metric"
        name="R1"
      />
    </board>
  )
  return circuit.getCircuitJson()
}

export const KicadResistor = () => {
  const circuitJson = createCircuit()
  return <CadViewer circuitJson={circuitJson as any} />
}

export default {
  title: "KicadResistor",
  component: KicadResistor,
}