import type {
  AnyCircuitElement,
  PcbBoard,
  PcbFabricationNoteDimension,
} from "circuit-json"
import { CadViewer } from "src/CadViewer"

const board: PcbBoard = {
  type: "pcb_board",
  pcb_board_id: "pcb_board_1",
  center: { x: 0, y: 0 },
  width: 86.36000254,
  height: 55.88000254,
  thickness: 1.6,
  num_layers: 4,
  material: "fr4",
}

const boardWidthDimension: PcbFabricationNoteDimension = {
  type: "pcb_fabrication_note_dimension",
  pcb_fabrication_note_dimension_id: "pcb_fabrication_note_dimension_1",
  pcb_component_id: "pcb_component_1",
  layer: "top",
  from: { x: -43.18, y: -27.94 },
  to: { x: 43.17999238, y: -27.94 },
  text: "3400.00 mil",
  offset: 2.5654,
  offset_distance: 2.5654,
  offset_direction: { x: 0, y: 1 },
  font: "tscircuit2024",
  font_size: 1.524,
  color: "#ec4899",
  arrow_size: 1.524,
}

const circuitJson: AnyCircuitElement[] = [board, boardWidthDimension]

/**
 * Reproduction from the TI DP83825EVM import.
 *
 * Expected: fabrication dimensions are omitted from the assembled 3D view.
 * Actual before the fix: a magenta 3400 mil dimension is drawn across the
 * bottom edge of the board.
 */
export const BoardWidthDimension = () => (
  <CadViewer circuitJson={circuitJson} autoRotateDisabled />
)

export default {
  title: "Repros/DP83825EVM Fabrication Dimension",
  component: BoardWidthDimension,
}
