import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type {
  PCBKeepout,
  PcbBoard,
  PcbNoteDimension,
  PcbNoteRect,
} from "circuit-json"
import { createKeepoutTextureForLayer } from "../src/textures/create-keepout-texture-for-layer"
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

const countNonTransparentPixels = (canvas: any) => {
  const ctx = canvas.getContext("2d")
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let count = 0
  for (let i = 3; i < data.length; i += 4) {
    if ((data[i] ?? 0) > 0) count++
  }
  return count
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

test("renders layerless pcb_note elements on the top PCB note texture by default", () => {
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    document: { createElement: () => createCanvas(1, 1) },
  })

  try {
    const noteRectWithoutLayer = {
      type: "pcb_note_rect",
      pcb_note_rect_id: "pcb_note_rect_1",
      center: { x: 0, y: 0 },
      width: 6,
      height: 4,
      stroke_width: 0.3,
      is_filled: true,
    } as unknown as PcbNoteRect

    const topTexture = createPcbNoteTextureForLayer({
      layer: "top",
      circuitJson: [board, noteRectWithoutLayer],
      boardData: board,
      traceTextureResolution: 10,
    })
    const bottomTexture = createPcbNoteTextureForLayer({
      layer: "bottom",
      circuitJson: [board, noteRectWithoutLayer],
      boardData: board,
      traceTextureResolution: 10,
    })

    expect(topTexture).not.toBeNull()
    expect(countNonTransparentPixels(topTexture!.image)).toBeGreaterThan(0)
    expect(bottomTexture).toBeNull()
  } finally {
    Object.assign(globalThis, { document: previousDocument })
  }
})

test("renders pcb_keepout elements when layers is omitted or empty", () => {
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    document: { createElement: () => createCanvas(1, 1) },
  })

  try {
    const keepoutWithoutLayers = {
      type: "pcb_keepout",
      pcb_keepout_id: "pcb_keepout_1",
      shape: "rect",
      center: { x: 0, y: 0 },
      width: "6mm",
      height: "4mm",
    } as unknown as PCBKeepout

    const topTexture = createKeepoutTextureForLayer({
      layer: "top",
      circuitJson: [board, keepoutWithoutLayers],
      boardData: board,
      traceTextureResolution: 10,
    })

    expect(topTexture).not.toBeNull()
    expect(countNonTransparentPixels(topTexture!.image)).toBeGreaterThan(0)
  } finally {
    Object.assign(globalThis, { document: previousDocument })
  }
})
