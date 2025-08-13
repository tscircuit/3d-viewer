import { CadViewer } from "src/CadViewer"
import bugsPadsAndTracesSoup from "./assets/soic-with-traces.json"
import LedFlashlightCircuitJson from "./assets/left-flashlight-board.json"

export const Default = () => (
  <CadViewer circuitJson={bugsPadsAndTracesSoup as any} />
  // <CadViewer circuitJson={bugsPadsAndTracesSoup as any} />
)

export default {
  title: "Simple",
  component: Default,
}

export const RotatedCapacitor = () => {
  return (
    <CadViewer>
      <board width="10mm" height="10mm">
        <capacitor
          capacitance="1000pF"
          footprint="0402"
          name="C1"
          pcbRotation={90}
        />
      </board>
    </CadViewer>
  )
}

export const LedFlashlightBoard = () => {
  return <CadViewer circuitJson={LedFlashlightCircuitJson as any} />
}
