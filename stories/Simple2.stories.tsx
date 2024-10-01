import { fn } from "@storybook/test"
import { CadViewer } from "src/CadViewer"

export const Default = () => (
  <CadViewer>
    <board width="10mm" height="40mm">
      <chip name="U1" footprint="tssop16" />
    </board>
  </CadViewer>
)

export default {
  title: "Simple2",
  component: Default,
}
