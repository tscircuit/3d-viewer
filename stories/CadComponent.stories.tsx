import { fn } from "@storybook/test"
import { CadViewer } from "src/CadViewer"
import bugsPadsAndTracesSoup from "./assets/soic-with-traces.json"
import { CadComponent } from "@tscircuit/soup"

const cad_component: CadComponent = {
  type: "cad_component",
  cad_component_id: "1",
  model_obj_url: "/easyeda-models/84af7f0f6529479fb6b1c809c61d205f",
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  pcb_component_id: "todo",
  source_component_id: "todo",
}

export const Default = () => (
  <CadViewer soup={(bugsPadsAndTracesSoup as any[]).concat([cad_component])} />
)

export default {
  title: "CadComponent",
  component: Default,
}
