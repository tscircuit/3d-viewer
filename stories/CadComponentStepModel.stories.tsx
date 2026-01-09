import "tscircuit"
import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"
import { getPlatformConfig } from "@tscircuit/eval"
import { useEffect, useState } from "react"
import stepModelUrl from "./assets/MachineContactMedium.step?url"

const createCircuit = async (modelUrl: string) => {
  const circuit = new Circuit({
    platform: getPlatformConfig(),
  })
  circuit.add(
    <board width="10mm" height="10mm">
      <chip
        name="U1"
        footprint="pinrow1"
        cadModel={
          <cadassembly>
            <cadmodel modelUrl={modelUrl} />
          </cadassembly>
        }
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}

export const CadComponentStepModel = () => {
  const [circuitJson, setCircuitJson] = useState<any[] | null>(null)

  useEffect(() => {
    const renderCircuit = async () => {
      const json = await createCircuit(stepModelUrl)
      setCircuitJson(json)
    }
    renderCircuit()
  }, [])

  if (!circuitJson) {
    return null
  }

  return <CadViewer circuitJson={circuitJson as any} />
}

CadComponentStepModel.storyName = "CAD Component STEP Model"

export default {
  title: "CadComponent/StepModel",
}
