import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import type { CanvasTexture } from "three"
import { createCombinedBoardTextures } from "../src/textures/create-combined-board-textures"
import { createBoardReliefTextures } from "../src/utils/create-board-relief-textures"

const pixel = (texture: CanvasTexture, x: number, y: number) =>
  Array.from(texture.image.getContext("2d").getImageData(x, y, 1, 1).data)

for (const layer of ["top", "bottom"] as const) {
  test(`${layer}: trace crossing an exposed pad retains the pad material`, () => {
    const previousDocument = globalThis.document
    Object.assign(globalThis, {
      document: { createElement: () => createCanvas(1, 1) },
    })
    try {
      const board: PcbBoard = {
        type: "pcb_board",
        pcb_board_id: "board",
        center: { x: 0, y: 0 },
        width: 10,
        height: 10,
        thickness: 1.6,
        num_layers: 2,
        material: "fr4",
      }
      const circuitJson: AnyCircuitElement[] = [
        board,
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "pad",
          pcb_component_id: "component",
          shape: "rect",
          x: 0,
          y: 0,
          width: 4,
          height: 4,
          layer,
        },
        {
          type: "pcb_trace",
          pcb_trace_id: "trace",
          route: [
            { route_type: "wire", x: -4, y: 0, width: 1, layer },
            { route_type: "wire", x: 4, y: 0, width: 1, layer },
          ],
        },
      ]
      const textures = createCombinedBoardTextures({
        circuitJson,
        boardData: board,
        traceTextureResolution: 20,
      })
      const color = (
        layer === "top" ? textures.topBoard : textures.bottomBoard
      )!
      const mask = (
        layer === "top" ? textures.topMaskedCopper : textures.bottomMaskedCopper
      )!
      // The canvas dependency already paints both parts of the pad the same gold.
      expect(pixel(color, 100, 100)).toEqual(pixel(color, 100, 80))
      const relief = createBoardReliefTextures(color, mask)!
      // Trace overlap must have the same metallic finish as the rest of the pad.
      expect(pixel(relief.metalnessMap, 100, 100)).toEqual(
        pixel(relief.metalnessMap, 100, 80),
      )
      expect(pixel(mask, 100, 100)[3]).toBe(0)
      // Covered routing outside the opening must still have relief.
      expect(pixel(mask, 30, 100)[3]).toBe(255)
    } finally {
      Object.assign(globalThis, { document: previousDocument })
    }
  })
}
