import { CadViewer } from "src/CadViewer"
import PcbCutoutCircuitJson from "./assets/pcb-cutout.json"
import PlatedPadsCircuitJson from "./assets/pill_plated_holes.json"

export const PcbCutout = () => (
  <CadViewer circuitJson={PcbCutoutCircuitJson as any} />
)

export const PlatedPads = () => (
  <CadViewer circuitJson={PlatedPadsCircuitJson as any} />
)

export default {
  title: "Components",
  component: PcbCutout,
}
