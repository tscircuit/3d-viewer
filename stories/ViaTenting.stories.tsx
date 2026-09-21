import { CadViewer } from "src/CadViewer"
import viaTentingCircuit from "./assets/via-tenting.json"

export const BoardDefaultsAndOverrides = () => (
  <div style={{ width: "100vw", height: "100vh" }}>
    <CadViewer circuitJson={viaTentingCircuit} />
  </div>
)

export default {
  title: "Via/Tenting",
  component: BoardDefaultsAndOverrides,
}
