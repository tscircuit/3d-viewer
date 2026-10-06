import { expect, test } from "bun:test"
import { createCombinedBoardTextures } from "../src/textures/create-combined-board-textures"
import { preprocessCircuitJson } from "../src/utils/preprocess-circuit-json"
import {
  modernSsopCircuit,
  pixels,
  ssopBoard,
  ssopRotatedCircuit,
  withRealCanvasDocument,
} from "./fixtures/legacy-story-textures"

test("SSOP Rotated's unchanged story input survives complete board texture composition", () => {
  const before = JSON.stringify(ssopRotatedCircuit)
  withRealCanvasDocument(() => {
    const actualCircuit = preprocessCircuitJson(ssopRotatedCircuit)
    const options = { boardData: ssopBoard, traceTextureResolution: 20 }
    const expected = createCombinedBoardTextures({
      ...options,
      circuitJson: modernSsopCircuit,
    })
    const actual = createCombinedBoardTextures({
      ...options,
      circuitJson: actualCircuit,
    })
    try {
      for (const key of [
        "topBoard",
        "bottomBoard",
        "topMaskedCopper",
        "bottomMaskedCopper",
      ] as const) {
        expect(actual[key]).not.toBeNull()
        expect(expected[key]).not.toBeNull()
        expect(pixels(actual[key]!)).toEqual(pixels(expected[key]!))
      }
    } finally {
      for (const texture of [
        ...Object.values(actual),
        ...Object.values(expected),
      ])
        texture?.dispose()
    }
  })
  expect(JSON.stringify(ssopRotatedCircuit)).toBe(before)
})
