import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { createCombinedBoardTextures } from "../src/textures/create-combined-board-textures"
import { createFabricationNoteTextureForLayer } from "../src/textures/create-fabrication-note-texture-for-layer"

const board: PcbBoard = {
  type: "pcb_board",
  pcb_board_id: "board",
  center: { x: 0, y: 0 },
  width: 12,
  height: 8,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
}

const notes: AnyCircuitElement[] = ["top", "bottom"].flatMap((side) => {
  const layer = side as "top" | "bottom"
  return [
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: `${layer}_polarity`,
      pcb_component_id: "component",
      layer,
      text: layer === "top" ? "+ A" : "K -",
      anchor_position: { x: -2, y: 1 },
      anchor_alignment: "center",
      font_size: 1,
    },
    {
      type: "pcb_fabrication_note_dimension",
      pcb_fabrication_note_dimension_id: `${layer}_dimension`,
      pcb_component_id: "component",
      layer,
      from: { x: -4, y: -2 },
      to: { x: 4, y: -2 },
      text: "8 mm",
      font_size: 0.5,
      arrow_size: 0.3,
      offset_distance: 0,
    },
  ] as AnyCircuitElement[]
})

test("fabrication inspection reveals polarity text on both sides independently of silkscreen", async () => {
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    document: { createElement: () => createCanvas(1, 1) },
  })
  try {
    const circuitJson = [board, ...notes]
    const assembled = createCombinedBoardTextures({
      circuitJson,
      boardData: board,
      traceTextureResolution: 24,
    })
    const inspection = createCombinedBoardTextures({
      circuitJson,
      boardData: board,
      traceTextureResolution: 24,
      visibility: {
        fabricationNotes: true,
        topSilkscreen: false,
        bottomSilkscreen: false,
      },
    })
    let panels = ""
    for (const [index, layer] of ["top", "bottom"].entries()) {
      const side = layer as "top" | "bottom"
      expect(
        createFabricationNoteTextureForLayer({
          layer: side,
          circuitJson,
          boardData: board,
        }),
      ).toBeNull()
      const normalImage =
        assembled[side === "top" ? "topBoard" : "bottomBoard"]!.image
      const inspectionImage =
        inspection[side === "top" ? "topBoard" : "bottomBoard"]!.image
      const normalPng = normalImage.toBuffer("image/png")
      const inspectionPng = inspectionImage.toBuffer("image/png")
      expect(normalPng.equals(inspectionPng)).toBeFalse()
      for (const [column, png] of [normalPng, inspectionPng].entries()) {
        const x = 10 + column * 310
        const y = 35 + index * 230
        panels += `<text x="${x}" y="${y - 10}" fill="white">${layer}: ${column ? "fabrication inspection" : "assembled board"}</text><image x="${x}" y="${y}" width="288" height="193" href="data:image/png;base64,${png.toString("base64")}"/>`
      }
    }
    await expect(
      `<svg xmlns="http://www.w3.org/2000/svg" width="630" height="465"><rect width="630" height="465" fill="#222"/>${panels}</svg>`,
    ).toMatchSvgSnapshot(import.meta.path)
  } finally {
    Object.assign(globalThis, { document: previousDocument })
  }
})
