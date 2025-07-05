import React, { useState, useEffect } from "react"
import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

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
      <trace from={".R1 > .pin1"} to={".R2 > .pin2"} />
      <trace from={".R4 > .pin1"} to={".R3 > .pin2"} />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}

export const BottomTraceThroughVias = () => {
  const [circuitJson, setCircuitJson] = useState<any>(null)

  useEffect(() => {
    const renderCircuit = async () => {
      const json = await createCircuit()
      setCircuitJson(json)
    }
    renderCircuit()
  }, [])

  if (!circuitJson) {
    return <div>Loading...</div>
  }

  return <CadViewer circuitJson={circuitJson as any} />
}

export default {
  title: "Bottom Trace through Vias",
  component: BottomTraceThroughVias,
}
