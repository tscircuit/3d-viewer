import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const createCircuit = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <footprint>
        <silkscreentext
          text="1234567890"
          pcbX={0}
          pcbY={0}
          fontSize={0.25}
          layer="top"
        />
      </footprint>
    </board>,
  )

  return circuit.getCircuitJson()
}

export const SilkscreenTextNumbers = () => {
  const circuitJson = createCircuit()
  return <CadViewer soup={circuitJson as any} />
}

export default {
  title: "Silkscreen Text",
  component: SilkscreenTextNumbers,
}
