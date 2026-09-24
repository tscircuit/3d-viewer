import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useState } from "react"
import { CadViewer } from "../src/CadViewer"
import { createSheetMetalFlexAssembly } from "./fixtures/create-sheet-metal-flex-assembly"

export default { title: "Flex PCB/Sheet Metal Assembly" }

export const WraparoundChannel = () => {
  const [circuitJson, setCircuitJson] = useState<AnyCircuitElement[]>()
  const [error, setError] = useState<string>()
  useEffect(() => {
    let active = true
    createSheetMetalFlexAssembly().then(
      (json) => {
        if (active) setCircuitJson(json)
      },
      (error) => {
        if (active) setError(String(error))
      },
    )
    return () => {
      active = false
    }
  }, [])
  if (error) return <div role="alert">{error}</div>
  if (!circuitJson) return <div role="status">Routing wraparound flex PCB…</div>
  return (
    <div style={{ height: "90vh" }}>
      <CadViewer circuitJson={circuitJson} autoRotateDisabled />
    </div>
  )
}
