import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"
import { useEffect, useState } from "react"
import { getPlatformConfig } from "@tscircuit/eval"
const createSingleLayerCircuit = async () => {
  const circuit = new Circuit({
    platform: getPlatformConfig(),
  })
  circuit.add(
    <board width="20mm" height="20mm" layers={1}>
      <resistor
        name="R1"
        resistance="1k"
        footprint="0805"
        layer="top"
        pcbX={-5}
      />
      <capacitor
        name="C1"
        capacitance="100nF"
        footprint="0805"
        layer="top"
        pcbX={0}
      />
      <led name="LED1" footprint="0805" layer="top" pcbX={5} />
      <trace from=".R1 > .pin2" to=".C1 > .pin1" />
      <trace from=".C1 > .pin2" to=".LED1 > .pin1" />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
export const SingleLayerBoard = () => {
  const [circuitJson, setCircuitJson] = useState<any[] | null>(null)

  useEffect(() => {
    const renderCircuit = async () => {
      const json = await createSingleLayerCircuit()
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
  title: "SingleLayerBoard",
  component: SingleLayerBoard,
}
