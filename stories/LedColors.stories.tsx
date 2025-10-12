import React, { useState, useEffect } from "react"
import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const createCircuit = async () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="25mm" height="25mm">
      <led name="D1" footprint="0402" color="red" pcbX={10} pcbY={0} />
      <led name="D2" footprint="0805" color="green" pcbX={-10} pcbY={0} />
      <led name="D3" footprint="0603" color="blue" pcbX={0} pcbY={-10} />
      <led name="D4" footprint="1206" color="yellow" pcbX={0} pcbY={10} />
      <trace from={".D1 > .pin1"} to={".D2 > .pin2"} />
      <trace from={".D4 > .pin1"} to={".D3 > .pin2"} />
    </board>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}

export const LedColors = () => {
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
  title: "Led Colors",
  component: LedColors,
}
