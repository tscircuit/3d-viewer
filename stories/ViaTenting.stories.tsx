import { CadViewer } from "src/CadViewer"
import viaTentingCircuit from "./assets/via-tenting.json"
import viaTentingOverlapCircuit from "./assets/via-tenting-overlap.json"

export const BoardDefaultsAndOverrides = () => (
  <div style={{ width: "100vw", height: "100vh" }}>
    <CadViewer circuitJson={viaTentingCircuit} />
  </div>
)

export const SilkscreenAndPadOverlap = () => (
  <div style={{ width: "100vw", height: "100vh" }}>
    <CadViewer circuitJson={viaTentingOverlapCircuit} />
  </div>
)

export default {
  title: "Via/Tenting",
  component: BoardDefaultsAndOverrides,
}
