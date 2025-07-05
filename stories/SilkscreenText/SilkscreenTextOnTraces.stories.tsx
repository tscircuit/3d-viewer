import React, { useState, useEffect } from "react"
import { CadViewer } from "src/CadViewer"
import { Circuit, SilkscreenText } from "@tscircuit/core"

const createCircuit = async () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="25mm" height="25mm">
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
        <silkscreentext
          text="Tscircuit build electronics with React"
          pcbX={0}
          pcbY={1.6}
        />
      </footprint>
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}

export const SilkscreenTextOnTraces = () => {
  const [circuitJson, setCircuitJson] = useState<any>(null)

  useEffect(() => {
    const fetchCircuit = async () => {
      const json = await createCircuit()
      setCircuitJson(json)
    }
    fetchCircuit()
  }, [])

  if (!circuitJson) {
    return <div>Loading...</div>
  }

  return <CadViewer circuitJson={circuitJson as any} />
}

export default {
  title: "Silkscreen Text",
  component: SilkscreenTextOnTraces,
}
