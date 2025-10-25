import { CadViewer } from "src/CadViewer"
import bugsPadsAndTracesSoup from "./assets/soic-with-traces.json"
import LedFlashlightCircuitJson from "./assets/left-flashlight-board.json"

export const WithTexture = () => (
  <CadViewer circuitJson={bugsPadsAndTracesSoup as any} />
)

export const LedFlashlightWithTexture = () => (
  <CadViewer circuitJson={LedFlashlightCircuitJson as any} />
)

export const SimpleBoardWithTexture = () => {
  return (
    <CadViewer>
      <board width="20mm" height="20mm">
        <resistor
          name="R1"
          footprint="0805"
          resistance="10k"
          pcbX={5}
          pcbY={5}
        />
        <capacitor
          name="C1"
          footprint="0603"
          capacitance="1uF"
          pcbX={-4}
          pcbY={0}
        />
        <chip name="U1" footprint="soic8" pcbX={0} pcbY={0} />
      </board>
    </CadViewer>
  )
}

export default {
  title: "Texture Support",
  component: WithTexture,
}
