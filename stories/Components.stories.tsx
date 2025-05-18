import { CadViewer } from "src/CadViewer"
import PcbCutoutCircuitJson from "./assets/pcb-cutout.json"

export const PcbCutout = () => (
  <CadViewer circuitJson={PcbCutoutCircuitJson as any} />
)

export default {
  title: "Components",
  component: PcbCutout,
}
