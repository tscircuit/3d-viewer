import { CadViewer } from "src/CadViewer"
import type { CadComponent } from "@tscircuit/soup"
import "@tscircuit/react-fiber"

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
  <CadViewer>
    <board width="10mm" height="10mm">
      <bug
        footprint="soic8"
        name="U1"
        cadModel={{
          jscad: {
            type: "cube",
            size: 5,
          },
        }}
      />
    </board>
  </CadViewer>
)

export default {
  title: "CadComponentWithJscadPlan",
  component: Default,
}
