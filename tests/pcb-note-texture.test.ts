import { expect, test } from "bun:test"
import type { PcbBoard, PcbNoteDimension } from "circuit-json"
import { createPcbNoteTextureForLayer } from "../src/textures/create-pcb-note-texture-for-layer"

const board: PcbBoard = {
  type: "pcb_board",
  pcb_board_id: "pcb_board_1",
  center: { x: 0, y: 0 },
  width: 20,
  height: 12,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
}

const dimension: PcbNoteDimension = {
  type: "pcb_note_dimension",
  pcb_note_dimension_id: "pcb_note_dimension_1",
  from: { x: -8, y: 4 },
  to: { x: 8, y: 4 },
  font: "tscircuit2024",
  font_size: 1,
  arrow_size: 0.5,
  layer: "top",
}

test("does not create a PCB note texture for dimensions", () => {
  expect(
    createPcbNoteTextureForLayer({
      layer: "top",
      circuitJson: [board, dimension],
      boardData: board,
    }),
  ).toBeNull()
})
