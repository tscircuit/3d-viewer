import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const createCircuit = () => {
  const circuit = new Circuit()

  circuit.add(
    <board
      width="20mm"
      height="20mm"
      material="fr1"
      autorouter="sequential-trace"
    >
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
      <trace from={".R1 > .right"} to={".R3 > .left"} />
      <trace from={".R2 > .right"} to={".R4 > .left"} />
    </board>,
  )

  return circuit.getCircuitJson()
}

export const fr1BoardMaterial = () => {
  const circuitJson = createCircuit()
  return <CadViewer circuitJson={circuitJson as any} />
}

export default {
  title: "fr1 Board Material",
  component: fr1BoardMaterial,
}
