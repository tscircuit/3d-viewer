import { CadViewer } from "src/CadViewer"
import type { CadComponent } from "circuit-json"

function modelViewer(modelString: string) {
  const model: CadComponent = {
    type: "cad_component",
    cad_component_id: "mechanical_model",
    pcb_component_id: "mechanical_component",
    source_component_id: "mechanical_source",
    footprinter_string: modelString,
    anchor_alignment: "center",
    model_object_fit: "contain_within_bounds",
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  }
  return <CadViewer circuitJson={[model]} />
}

export const SetScrewShaftCollar = () =>
  modelViewer("shaftcollar_bore8mm_od16mm_w8mm_m4_setscrew")

export const LeftHandedCompressionSpring = () =>
  modelViewer(
    "compressionspring_od8mm_wire1mm_l20mm_turns8_closedground_lefthanded",
  )

export const PlainBushing = () => modelViewer("plainbushing_id8mm_od12mm_l20mm")

export default { title: "Mechanical Model Flags" }
