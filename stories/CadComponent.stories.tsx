import { fn } from "@storybook/test"
import { CadViewer } from "src/CadViewer"
import bugsPadsAndTracesSoup from "./assets/soic-with-traces.json"
import type { CadComponent } from "@tscircuit/soup"

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

export const SSOPRotated = () => (
  <CadViewer
    soup={(bugsPadsAndTracesSoup as any[]).concat([
      {
        type: "cad_component",
        cad_component_id: "cad_component_1",
        pcb_component_id: "pcb_component_1",
        source_component_id: "source_component_1",
        position: {
          x: 0,
          y: 0,
          z: 10.3,
        },
        rotation: {
          x: 0,
          y: 0,
          z: 90,
        },
        model_obj_url:
          "https://modelcdn.tscircuit.com/easy_models/download?uuid=47443b588a77418ba6b4ea51975c36c0",
      },
      {
        type: "cad_component",
        cad_component_id: "cad_component_1",
        pcb_component_id: "pcb_component_1",
        source_component_id: "source_component_1",
        position: {
          x: 10,
          y: 0,
          z: 0.1,
        },
        rotation: {
          x: 0,
          y: 0,
          z: 0,
        },
        model_obj_url:
          "https://modelcdn.tscircuit.com/easy_models/download?uuid=47443b588a77418ba6b4ea51975c36c0&",
      },
    ])}
  />
)

export default {
  title: "CadComponent",
  component: Default,
}
