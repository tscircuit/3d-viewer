import type { AnyCircuitElement } from "circuit-json"
import { CadViewer } from "src/CadViewer"

/**
 * The pre-`cad_fdm_enclosure` representation used during the staged migration:
 * separate base/lid CAD components share one synthetic PCB owner. Open the
 * Appearance menu and confirm one control cycles both parts together through
 * translucent, opaque and hidden.
 */
const basePlan = {
  type: "subtract",
  shapes: [
    {
      type: "translate",
      vector: [0, 0, 7],
      shape: { type: "cuboid", size: [44, 28, 14] },
    },
    {
      type: "translate",
      vector: [0, 0, 9],
      shape: { type: "cuboid", size: [40, 24, 14] },
    },
    {
      type: "translate",
      vector: [0, -13, 7],
      shape: {
        type: "rotate",
        angles: [Math.PI / 2, 0, 0],
        shape: { type: "cuboid", size: [10, 4, 4] },
      },
    },
  ],
}

const lidPlan = {
  type: "translate",
  vector: [0, 0, 15],
  shape: { type: "cuboid", size: [44, 28, 2] },
}

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board_1",
    center: { x: 0, y: 0 },
    width: 38,
    height: 22,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "source_component",
    source_component_id: "source_enclosure",
    ftype: "simple_chip",
    name: "assembled-enclosure",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_enclosure",
    source_component_id: "source_enclosure",
    center: { x: 0, y: 0 },
    width: 44,
    height: 28,
    layer: "top",
    rotation: 0,
    do_not_place: true,
    is_allowed_to_be_off_board: true,
    obstructs_within_bounds: false,
  },
  {
    type: "cad_component",
    cad_component_id: "cad_enclosure_base",
    source_component_id: "source_enclosure",
    pcb_component_id: "pcb_enclosure",
    position: { x: 0, y: 0, z: -6.8 },
    rotation: { x: 0, y: 0, z: 0 },
    model_jscad: basePlan,
    model_unit_to_mm_scale_factor: 1,
    model_object_fit: "contain_within_bounds",
    model_origin_alignment: "bottom_center_of_component",
    anchor_alignment: "center",
    show_as_translucent_model: false,
  },
  {
    type: "cad_component",
    cad_component_id: "cad_enclosure_lid",
    source_component_id: "source_enclosure",
    pcb_component_id: "pcb_enclosure",
    position: { x: 0, y: 0, z: -6.8 },
    rotation: { x: 0, y: 0, z: 0 },
    model_jscad: lidPlan,
    model_unit_to_mm_scale_factor: 1,
    model_object_fit: "contain_within_bounds",
    model_origin_alignment: "bottom_center_of_component",
    anchor_alignment: "center",
    show_as_translucent_model: false,
  },
] as AnyCircuitElement[]

export const AssembledCompatibilityEnclosure = () => (
  <CadViewer circuitJson={circuitJson} />
)

export default {
  title: "Enclosures/Assembled Compatibility",
  component: AssembledCompatibilityEnclosure,
}
