import type { AnyCircuitElement } from "circuit-json"
import { CadViewer } from "../src/CadViewer"
import circuitJson from "./fixtures/three-disc-flex.json"

export default { title: "Flex PCB" }

/** Autorouted capsule fixture from core: power contacts, SOIC-8, resistor, LED.
 * Right-click and choose Fold PCBs to stack its three circular areas.
 */
export const ThreeDiscCapsule = () => (
  <div style={{ width: "100%", height: "90vh" }}>
    <CadViewer
      circuitJson={circuitJson as AnyCircuitElement[]}
      autoRotateDisabled
    />
  </div>
)
