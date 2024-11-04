import { fn } from "@storybook/test"
import { CadViewer } from "src/CadViewer"
import bugsPadsAndTracesSoup from "./assets/soic-with-traces.json"

export const Default = () => <CadViewer soup={bugsPadsAndTracesSoup as any} />

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
