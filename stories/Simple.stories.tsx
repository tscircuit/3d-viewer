import { fn } from "@storybook/test"
import { CadViewer } from "src/CadViewer"
import bugsPadsAndTracesSoup from "./assets/soic-with-traces.json"
import { ManifoldViewer } from "src/manifold-viewer/ManifoldViewer"

export const Default = () => (
  <ManifoldViewer circuitJson={bugsPadsAndTracesSoup as any} />
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
