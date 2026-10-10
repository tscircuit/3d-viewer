import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type {
  AnyCircuitElement,
  PcbBoard,
  PcbFabricationNoteDimension,
} from "circuit-json"
import { createCombinedBoardTextures } from "../src/textures/create-combined-board-textures"

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

const renderTopBoard = (circuitJson: AnyCircuitElement[]) => {
  const texture = createCombinedBoardTextures({
    circuitJson,
    boardData: board,
    traceTextureResolution: 4,
  }).topBoard
  if (!texture) throw new Error("Expected a top-board texture")
  return texture.image.toBuffer("image/png")
}

test("fabrication dimensions do not change the assembled board texture", () => {
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    document: { createElement: () => createCanvas(1, 1) },
  })

  try {
    const boardWithDimension = renderTopBoard([board, boardWidthDimension])
    const boardWithoutDimension = renderTopBoard([board])
    expect(boardWithDimension.equals(boardWithoutDimension)).toBeTrue()
  } finally {
    Object.assign(globalThis, { document: previousDocument })
  }
})
