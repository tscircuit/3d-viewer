import React, { useState, useEffect } from "react"
import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const createCircuit = async () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="40mm" height="40mm">
      {/* Normal opaque components */}
      <chip name="U1" footprint="soic8" pcbX={-10} pcbY={-10} />
      <resistor
        name="R1"
        footprint="0805"
        pcbX={10}
        pcbY={-10}
        resistance="10k"
      />

      {/* Translucent components */}
      <chip
        name="U2"
        footprint="soic8"
        pcbX={-10}
        pcbY={10}
        showAsTranslucentModel
      />
      <resistor
        name="R2"
        footprint="0805"
        pcbX={10}
        pcbY={10}
        resistance="22k"
        showAsTranslucentModel
      />
      <capacitor
        name="C1"
        footprint="0603"
        pcbX={0}
        pcbY={0}
        capacitance="10uF"
        showAsTranslucentModel
      />
      <diode
        name="D1"
        footprint="0805"
        pcbX={0}
        pcbY={-15}
        showAsTranslucentModel
      />

      {/* Traces */}
      <trace from={".U1 > .pin1"} to={".R1 > .pin1"} />
      <trace from={".U2 > .pin8"} to={".C1 > .pin1"} />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}

export const TranslucentMultipleComponents = () => {
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
  title: "Translucent/Multiple Components",
  component: TranslucentMultipleComponents,
}
