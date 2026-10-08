import { CadViewer } from "src/CadViewer"
import type { CadComponent, PcbBoard } from "circuit-json"

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
  const board: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "mechanical_preview_board",
    center: { x: 0, y: 0 },
    width: 50,
    height: 50,
    thickness: 1.4,
    material: "fr4",
    num_layers: 2,
  }
  return <CadViewer circuitJson={[board, model]} />
}

export const SetScrewShaftCollar = () =>
  modelViewer("shaftcollar_bore8mm_od16mm_w8mm_m4_setscrew")

export const LeftHandedCompressionSpring = () =>
  modelViewer(
    "compressionspring_od8mm_wire1mm_l20mm_turns8_closedground_lefthanded",
  )

export const PlainBushing = () => modelViewer("plainbushing_id8mm_od12mm_l20mm")

export default { title: "Mechanical Model Flags" }
