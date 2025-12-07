import { useState, useEffect } from "react"
import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const createCircuit = async () => {
  const circuit = new Circuit()

  circuit.add(
    <panel width="50mm" height="20mm">
      <board width="20mm" height="15mm">
        <resistor resistance="1k" footprint="0402" name="R1" />
      </board>
      <board width="20mm" height="15mm">
        <resistor resistance="1k" footprint="0402" name="R2" />
      </board>
    </panel>,
  )

  await circuit.renderUntilSettled()

  return circuit.getCircuitJson()
}

export const PanelsExample = () => {
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
  title: "PcbPanel",
  component: PanelsExample,
}
