import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { CircuitJson } from "circuit-json"
import { createSoldermaskTextureForLayer } from "../src/textures/create-soldermask-texture-for-layer"
import { getSoldermaskPalette } from "../src/textures/soldermask/soldermask-drawing"
import { getBoardEdgeColor } from "../src/utils/get-board-edge-color"
import { createCoverlayCircuit } from "./fixtures/coverlay-circuit"

function renderTexture(circuit: CircuitJson) {
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    document: { createElement: () => createCanvas(1, 1) },
  })
  try {
    const texture = createSoldermaskTextureForLayer({
      circuitJson: circuit,
      boardData: circuit.find((e) => e.type === "pcb_board")!,
      layer: "top",
      traceTextureResolution: 30,
    })!
    try {
      const canvas = texture.image
      const png = canvas.toBuffer("image/png").toString("base64")
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}"><image width="100%" height="100%" href="data:image/png;base64,${png}"/></svg>`
    } finally {
      texture.dispose()
    }
  } finally {
    globalThis.document = previousDocument
  }
}

test("yellow flex coverlay reaches the interactive board texture", async () => {
  await expect(
    renderTexture(createCoverlayCircuit("yellow")),
  ).toMatchSvgSnapshot(import.meta.path, "yellow")
})

test("black flex coverlay reaches the interactive board texture", async () => {
  await expect(
    renderTexture(createCoverlayCircuit("black")),
  ).toMatchSvgSnapshot(import.meta.path, "black")
})

test("white flex coverlay reaches the interactive board texture", async () => {
  await expect(
    renderTexture(createCoverlayCircuit("white")),
  ).toMatchSvgSnapshot(import.meta.path, "white")
})

test("coverlay leaves the polyimide edge amber despite a solder-mask color", () => {
  const board = createCoverlayCircuit("black").find(
    (e) => e.type === "pcb_board",
  )!
  board.solder_mask_color = "red"
  expect(getBoardEdgeColor(board).getHexString()).toBe("cc9c33")
  expect(getSoldermaskPalette(board).soldermask).toBe("#111111")
})

test("rigid boards ignore coverlay appearance", () => {
  const board = createCoverlayCircuit("black").find(
    (e) => e.type === "pcb_board",
  )!
  board.material = "fr4"
  const black = getSoldermaskPalette(board)
  board.coverlay_color = "white"
  expect(getSoldermaskPalette(board)).toEqual(black)
})
