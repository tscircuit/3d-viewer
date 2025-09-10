import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"
import { useEffect, useState } from "react"
import { getPlatformConfig } from "@tscircuit/eval"

const createCircuit = async () => {
  const circuit = new Circuit({
    platform: getPlatformConfig(),
  })
  circuit.add(
    <board width="5mm" height="5mm">
      <resistor
        resistance="1k"
        footprint="kicad:Resistor_SMD/R_0402_1005Metric"
        name="R1"
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}

export const KicadResistor = () => {
  const [circuitJson, setCircuitJson] = useState<any[] | null>(null)
  useEffect(() => {
    const renderCircuit = async () => {
      const json = await createCircuit()
      const cadComp = json.find((e) => e.type === "cad_component")!
      cadComp.model_unit_to_mm_scale_factor = 2.54
      setCircuitJson(json)
    }
    renderCircuit()
  }, [])
  if (!circuitJson) {
    return null
  }
  return (
    <>
      <CadViewer circuitJson={circuitJson as any} />
      <pre>
        {JSON.stringify(
          circuitJson.filter((item) => item.type === "cad_component"),
          null,
          2,
        )}
      </pre>
    </>
  )
}

export default {
  title: "KicadResistor",
  component: KicadResistor,
}
