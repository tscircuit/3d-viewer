import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { createDefaultFlexBoard } from "../stories/fixtures/create-default-flex-board"
import { createSoldermaskTextureForLayer } from "../src/textures/create-soldermask-texture-for-layer"

test("TSX flex board renders amber coverlay and copper traces without FR4 green", async () => {
  const circuitJson = await createDefaultFlexBoard()
  const board = circuitJson.find((e) => e.type === "pcb_board")!
  expect(board.material).toBe("flex")
  expect([undefined, "not_specified"]).toContain(board.solder_mask_color)
  expect(circuitJson.filter((e) => e.type === "pcb_trace_error")).toEqual([])
  expect(circuitJson.some((e) => e.type === "pcb_trace")).toBe(true)

  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    document: { createElement: () => createCanvas(1, 1) },
  })
  try {
    const texture = createSoldermaskTextureForLayer({
      circuitJson,
      boardData: board,
      layer: "top",
      traceTextureResolution: 30,
    })!
    try {
      const canvas = texture.image
      const pixels = canvas
        .getContext("2d")
        .getImageData(0, 0, canvas.width, canvas.height).data
      const count = (r: number, g: number, b: number) => {
        let matches = 0
        for (let i = 0; i < pixels.length; i += 4) {
          if (
            pixels[i] === r &&
            pixels[i + 1] === g &&
            pixels[i + 2] === b &&
            pixels[i + 3] === 255
          )
            matches++
        }
        return matches
      }
      expect(count(204, 155, 50)).toBeGreaterThan(100)
      expect(count(203, 156, 59)).toBeGreaterThan(100)
      expect(count(23, 97, 59)).toBe(0)
      expect(count(15, 79, 48)).toBe(0)
      // The capsule story specifies this amber explicitly. Rendering the same
      // TSX board with that override must produce identical surface pixels.
      const explicitBoard = { ...board, solder_mask_color: "#cc9b32" }
      const explicitTexture = createSoldermaskTextureForLayer({
        circuitJson: circuitJson.map((e) => (e === board ? explicitBoard : e)),
        boardData: explicitBoard,
        layer: "top",
        traceTextureResolution: 30,
      })!
      try {
        const explicitPixels = explicitTexture.image
          .getContext("2d")
          .getImageData(0, 0, canvas.width, canvas.height).data
        expect(pixels).toEqual(explicitPixels)
      } finally {
        explicitTexture.dispose()
      }
    } finally {
      texture.dispose()
    }
  } finally {
    globalThis.document = previousDocument
  }
})
