import { CadViewer } from "src/CadViewer"
import { Circuit, SilkscreenText } from "@tscircuit/core"

const createCircuit = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <footprint>
        <silkscreentext text="A" />
      </footprint>
    </board>,
  )

  return circuit.getCircuitJson()
}

export const SilkscreenTextCenter = () => {
  const circuitJson = createCircuit()
  return <CadViewer circuitJson={circuitJson as any} />
}

export default {
  title: "Silkscreen Text",
  component: SilkscreenTextCenter,
}
