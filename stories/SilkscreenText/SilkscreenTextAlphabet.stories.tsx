import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const createCircuit = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <footprint>
        <silkscreentext
          text="abcdefghijklmnopqrstuvwxyz"
          pcbX={0}
          pcbY={0}
          pcbRotation={0}
          layer="top"
          fontSize={0.25}
        />
        <silkscreentext
          text="ABCDEFGHIJKLMNOPQRSTUVWXYZ"
          pcbX={0}
          pcbY={2}
          pcbRotation={0}
          fontSize={0.25}
          layer="top"
        />
      </footprint>
    </board>,
  )

  return circuit.getCircuitJson()
}

export const SilkscreenTextAlphabet = () => {
  const circuitJson = createCircuit()
  return <CadViewer circuitJson={circuitJson as any} />
}

export default {
  title: "Silkscreen Text",
  component: SilkscreenTextAlphabet,
}
