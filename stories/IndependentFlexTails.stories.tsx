import { transformCircuitJsonCadComponents } from "@tscircuit/flex-utils"
import { CadViewer } from "../src/CadViewer"
import { createIndependentFlexTails } from "./fixtures/independent-flex-tails"

export default { title: "Flex PCB/Independent Tails" }

const { circuitJson } = createIndependentFlexTails()
const foldedJson = transformCircuitJsonCadComponents(circuitJson, {
  foldPcbs: true,
})

/** Encoder returns beneath the body; JST bends down independently.
 * Right-click and toggle Fold PCBs to compare the same geometry in both states. */
export const Folded = () => (
  <div style={{ height: "90vh" }}>
    <CadViewer circuitJson={foldedJson} autoRotateDisabled />
  </div>
)

export const Flat = () => (
  <div style={{ height: "90vh" }}>
    <CadViewer circuitJson={circuitJson} autoRotateDisabled />
  </div>
)
