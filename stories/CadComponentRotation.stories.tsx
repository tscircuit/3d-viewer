import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const cadComponentRotation = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor
        pcbX={-2}
        resistance="1k"
        footprint="0402"
        name="R1"
        layer="top"
        pcbRotation="45deg"
      />
      <resistor
        pcbX={2}
        resistance="1k"
        footprint="0402"
        name="R2"
        layer="bottom"
        pcbRotation="45deg"
      />
    </board>,
  )

  return circuit.getCircuitJson()
}

export const CadComponentRotation = () => {
  const circuitJson = cadComponentRotation()
  return <CadViewer circuitJson={circuitJson as any} />
}

export default {
  title: "Cad Component Rotation",
  component: CadComponentRotation,
}
