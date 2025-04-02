import { CadViewer } from "src/CadViewer"
import bugsPadsAndTracesSoup from "./assets/soic-with-traces.json"

export const WithClickToInteract = () => (
  <CadViewer
    circuitJson={bugsPadsAndTracesSoup as any[]}
    clickToInteractEnabled={true}
  />
)

export default {
  title: "ClickToInteract",
  component: WithClickToInteract,
}
