import type { CadComponent } from "circuit-json"
import { CadViewer } from "src/CadViewer"
import bugsPadsAndTracesSoup from "./assets/soic-with-traces.json"

export default {
  title: "CadViewer",
  component: CadViewer,
}

const badStlUrl = "https://example.com/nonexistent.stl"

const cad_component: CadComponent = {
  type: "cad_component",
  cad_component_id: "1",
  model_obj_url: badStlUrl,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  pcb_component_id: "todo",
  source_component_id: "todo",
}

export const BadStlUrl = () => {
  return (
    <CadViewer
      soup={(bugsPadsAndTracesSoup as any[]).concat([cad_component])}
    />
  )
}
