import { CadViewer } from "src/CadViewer"
import xiaoboardCircuitJson from "./assets/xiaoboard.json"

export const Default = () => (
  <CadViewer circuitJson={xiaoboardCircuitJson as any} />
)

export default {
  title: "Xiaoboard",
  component: Default,
}
