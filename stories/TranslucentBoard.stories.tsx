import React, { useState, useEffect } from "react"
import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const createCircuit = async () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="30mm" height="30mm">
      <chip name="U1" footprint="soic8" pcbX={0} pcbY={0} />
      <resistor
        name="R1"
        footprint="0805"
        pcbX={10}
        pcbY={0}
        resistance="10k"
      />
      <capacitor
        name="C1"
        footprint="0603"
        pcbX={-10}
        pcbY={0}
        capacitance="1uF"
      />
      <chip
        name="U2"
        footprint="soic8"
        pcbX={0}
        pcbY={9}
        showAsTranslucentModel
      />
      <trace from={".U1 > .pin1"} to={".R1 > .pin1"} />
      <trace from={".U1 > .pin8"} to={".C1 > .pin2"} />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}

export const TranslucentBoard = () => {
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
  title: "Keyboard/Translucent Board",
  component: TranslucentBoard,
}
