import type { AnyCircuitElement } from "circuit-json"
import { CadViewer } from "src/CadViewer"

const remoteGlbCircuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_remote_glb",
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    width: 10,
    height: 10,
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_remote_glb",
    source_component_id: "source_component_remote_glb",
    center: { x: 0, y: 0 },
    width: 1,
    height: 1,
    layer: "top",
    rotation: 0,
  },
  {
    type: "source_component",
    source_component_id: "source_component_remote_glb",
    name: "Remote GLB Chip",
    ftype: "simple_resistor",
    resistance: 1000,
  },
  {
    type: "cad_component",
    cad_component_id: "cad_component_remote_glb",
    source_component_id: "source_component_remote_glb",
    pcb_component_id: "pcb_component_remote_glb",
    position: { x: 0, y: 0, z: 0.6 },
    rotation: { x: 90, y: 0, z: 0 },
    model_glb_url: "https://modelcdn.tscircuit.com/jscad_models/soic6.glb",
  },
]

export const RemoteSoic6Glb = () => (
  <div style={{ width: 640, height: 480 }}>
    <CadViewer circuitJson={remoteGlbCircuit} />
  </div>
)

RemoteSoic6Glb.storyName = "Remote SOIC-6 GLB"

export default {
  title: "Bugs/Remote GLB Brightness",
}
