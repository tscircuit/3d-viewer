import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"
import { useEffect, useState } from "react"
import { getPlatformConfig } from "@tscircuit/eval"

const createCircuit = async () => {
  const circuit = new Circuit({
    platform: getPlatformConfig(),
  })
  circuit.add(
    <board width="10mm" height="10mm">
      <pinheader
        footprint="pinrow3_smd_rightangle_p2.54mm"
        pinCount={3}
        layer="bottom"
        pcbOrientation="horizontal"
        name="JP1"
        schPinArrangement={{
          rightSide: {
            direction: "bottom-to-top",
            pins: [1, 2, 3],
          },
        }}
        pcbRotation={180}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}

export const BottomLayer = () => {
  const [circuitJson, setCircuitJson] = useState<any[] | null>(null)
  useEffect(() => {
    const renderCircuit = async () => {
      const json = await createCircuit()
      const cadComp = json.find((e) => e.type === "cad_component")!
      // cadComp.model_unit_to_mm_scale_factor = 2.54
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
  title: "BottomLayer",
  component: BottomLayer,
}
