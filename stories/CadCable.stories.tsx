import { CadViewer } from "src/CadViewer"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_cad_cable_repro",
    center: { x: 0, y: 0 },
    width: 30,
    height: 20,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "cad_cable",
    cad_cable_id: "cad_cable_repro",
    name: "JST PH cable",
    cableprinter_string: "jst_ph_pins4",
    from_source_component_id: "source_component_motor",
    to_source_component_id: "source_component_controller",
    from_connector_pin1_position: { x: -10, y: -1, z: 4 },
    to_connector_pin1_position: { x: 10, y: -1, z: 4 },
    path: [
      { x: -10, y: 0, z: 4 },
      { x: -8, y: 0, z: 8 },
      { x: 0, y: 0, z: 12 },
      { x: 8, y: 0, z: 8 },
      { x: 10, y: 0, z: 4 },
    ],
  },
]

/**
 * Reproduction for cad_cable elements being omitted by the interactive viewer.
 * Expected: a four-conductor JST PH cable arches above the board.
 * Actual before the fix: only the bare board is rendered.
 */
export const MissingCadCable = () => (
  <CadViewer circuitJson={circuitJson} autoRotateDisabled />
)

export default {
  title: "Repros/CAD Cable Omitted",
  component: MissingCadCable,
}
