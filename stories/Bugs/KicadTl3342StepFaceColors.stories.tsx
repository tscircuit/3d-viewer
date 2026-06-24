import { CadViewer } from "src/CadViewer"
import tl3342FootprintCircuitJson from "../assets/SW_SPST_TL3342-footprint.json"
import tl3342StepUrl from "../assets/SW_SPST_TL3342.step?url"

const tl3342CadComponent = {
  type: "cad_component",
  cad_component_id: "cad_component_0",
  position: {
    x: 0,
    y: 0,
    z: 0.7,
  },
  rotation: {
    x: 0,
    y: 0,
    z: 0,
  },
  pcb_component_id: "pcb_component_0",
  source_component_id: "source_component_0",
  model_step_url: tl3342StepUrl,
  model_origin_alignment: "center_of_component_on_board_surface",
  anchor_alignment: "center_of_component_on_board_surface",
}

const tl3342CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    source_board_id: "source_board_0",
    center: {
      x: 0,
      y: 0,
    },
    thickness: 1.4,
    num_layers: 2,
    width: 14,
    height: 12,
    material: "fr4",
    min_trace_width: 0.1,
    min_via_hole_diameter: 0.2,
    min_via_pad_diameter: 0.3,
    min_via_hole_edge_to_via_hole_edge_clearance: 0.1,
    min_trace_to_pad_edge_clearance: 0.1,
    min_pad_edge_to_pad_edge_clearance: 0.1,
    min_plated_hole_drill_edge_to_drill_edge_clearance: 0.15,
    min_board_edge_clearance: 0.2,
  } as any,
  ...((tl3342FootprintCircuitJson as any[]) || []).map((element) => {
    if (element.type === "source_component") {
      return {
        ...element,
        name: "SW1",
        ftype: "simple_push_button",
        source_group_id: "source_group_0",
        are_pins_interchangeable: true,
      }
    }

    if (element.type === "pcb_component") {
      return {
        ...element,
        subcircuit_id: "subcircuit_source_group_0",
        do_not_place: false,
        obstructs_within_bounds: true,
      }
    }

    return element
  }),
  tl3342CadComponent as any,
]

export const StepOnlyLocalFixture = () => (
  <CadViewer autoRotateDisabled circuitJson={tl3342CircuitJson} />
)

StepOnlyLocalFixture.storyName = "STEP-Only Local Fixture"

export default {
  title: "Bugs/KiCad TL3342 STEP Face Colors",
}
