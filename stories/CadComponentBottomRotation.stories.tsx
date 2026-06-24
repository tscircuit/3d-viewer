import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const cadComponentBottomRotation = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <resistor
        name="R3"
        footprint="0805"
        resistance="10k"
        layer={"bottom"}
        pcbRotation={300}
      />
      <resistor
        name="R4"
        footprint="0805"
        resistance="10k"
        layer="top"
        pcbRotation={45}
      />
      <resistor
        name="R5"
        footprint="0805"
        resistance="10k"
        pcbX={1}
        pcbY={-6}
        layer="bottom"
        pcbRotation={70}
      />
      <resistor
        name="R6"
        footprint="0805"
        resistance="10k"
        pcbX={3}
        pcbY={5}
        layer="top"
        pcbRotation={135}
      />
      <resistor
        name="R7"
        footprint="0805"
        resistance="10k"
        layer="bottom"
        pcbRotation={300}
      />
      <resistor
        name="R8"
        footprint="0805"
        resistance="10k"
        pcbX={2}
        pcbY={-5}
        layer="top"
        pcbRotation={225}
      />
      <resistor
        name="R9"
        footprint="0805"
        resistance="10k"
        pcbX={2}
        pcbY={7}
        layer="bottom"
        pcbRotation={280}
      />
    </board>,
  )

  return circuit.getCircuitJson()
}

export const CadComponentBottomRotation = () => {
  const circuitJson = cadComponentBottomRotation()
  return <CadViewer circuitJson={circuitJson as any} />
}

export default {
  title: "Cad Component Bottom Rotation",
  component: CadComponentBottomRotation,
}
