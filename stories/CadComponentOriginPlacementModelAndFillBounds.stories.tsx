import "tscircuit"
import { CadViewer } from "src/CadViewer"
import { CircuitJson } from "circuit-json"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 50,
    height: 30,
    thickness: 1.4,
  },
  {
    anchor_alignment: "center_of_component_on_board_surface",
    cad_component_id: "cad_component_0",
    footprinter_string: undefined,
    model_board_normal_direction: "z+",
    model_glb_url: undefined,
    model_gltf_url: undefined,
    model_jscad: undefined,
    model_mtl_url: undefined,
    model_object_fit: "fill_bounds",
    model_obj_url:
      "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=4e90b6d8552a4e058d9ebe9d82e11f3a&pn=C9900017879&cachebust_origin=http%3A%2F%2Flocalhost%3A6006",
    model_origin_alignment: "center_of_component_on_board_surface",
    model_origin_position: { x: 0, y: 0, z: -2.5000069999999996 },
    model_step_url: undefined,
    model_stl_url: undefined,
    model_unit_to_mm_scale_factor: undefined,
    model_wrl_url: undefined,
    pcb_component_id: "pcb_component_0",
    position: { x: 0, y: 1.0658141036401503e-14, z: 0.7 },
    rotation: { x: 0, y: 0, z: 270 },
    size: { x: 24, y: 40, z: 18 },
    show_as_translucent_model: undefined,
    source_component_id: "source_component_0",
    type: "cad_component",
  },
] as CircuitJson
export const CadComponentGlbAssembly = () => (
  <CadViewer circuitJson={circuitJson} />
)

CadComponentGlbAssembly.storyName = "CAD Component Origin Placement Model"

export default {
  title: "CadComponent/OriginPlacementModel",
}
