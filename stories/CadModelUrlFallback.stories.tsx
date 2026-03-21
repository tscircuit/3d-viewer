import type { CadComponent } from "circuit-json"
import { CadViewer } from "src/CadViewer"
import bugsPadsAndTracesSoup from "./assets/soic-with-traces.json"

export default {
  title: "CadViewer",
  component: CadViewer,
}

const missingWrlUrl = "https://example.com/nonexistent.wrl"
const workingStepUrl = "https://modelcdn.tscircuit.com/jscad_models/soic12.step"

const cad_component: CadComponent = {
  type: "cad_component",
  cad_component_id: "1",
  model_wrl_url: missingWrlUrl,
  model_step_url: workingStepUrl,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  pcb_component_id: "todo",
  source_component_id: "todo",
  anchor_alignment: "center",
  model_object_fit: "contain_within_bounds",
}

export const Wrl404FallsBackToStep = () => {
  return (
    <CadViewer
      circuitJson={(bugsPadsAndTracesSoup as any[]).concat([cad_component])}
    />
  )
}
