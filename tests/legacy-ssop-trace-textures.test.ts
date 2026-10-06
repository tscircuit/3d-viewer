import { expect, test } from "bun:test"
import { createTraceTextureForLayer } from "../src/utils/trace-texture"
import { preprocessCircuitJson } from "../src/utils/preprocess-circuit-json"
import {
  modernSsopCircuit,
  pixel,
  pixels,
  ssopBoard,
  ssopRotatedCircuit,
  withRealCanvasDocument,
} from "./fixtures/legacy-story-textures"

test("SSOP Rotated's legacy vias retain top and bottom copper in real trace textures", () => {
  const before = JSON.stringify(ssopRotatedCircuit)
  const vias = ssopRotatedCircuit.filter(
    (element) => element.type === "pcb_via",
  )
  expect(vias).toHaveLength(4)
  for (const via of vias) {
    expect("layers" in via).toBe(false)
    expect("pcb_via_id" in via).toBe(false)
  }

  withRealCanvasDocument(() => {
    const actualCircuit = preprocessCircuitJson(ssopRotatedCircuit)
    for (const layer of ["top", "bottom"] as const) {
      const options = {
        layer,
        boardData: ssopBoard,
        traceColor: "rgb(230,153,51)",
        traceTextureResolution: 20,
      }
      const expected = createTraceTextureForLayer({
        ...options,
        circuitJson: modernSsopCircuit,
      })!
      const actual = createTraceTextureForLayer({
        ...options,
        circuitJson: actualCircuit,
      })!
      try {
        expect(actual).not.toBeNull()
        expect(actual.image.width).toBe(400)
        expect(actual.image.height).toBe(400)
        expect(pixels(actual)).toEqual(pixels(expected))
        // Sample every annulus away from the center drill. This prevents a
        // no-crash fix from silently dropping the legacy vias.
        for (const via of vias) {
          const x = Math.round((via.x + 10) * 20) + 3
          const y = Math.round((layer === "top" ? 10 - via.y : 10 + via.y) * 20)
          expect(pixel(actual, x, y)[3]).toBeGreaterThan(0)
        }
      } finally {
        actual?.dispose()
        expected?.dispose()
      }
    }
  })
  expect(JSON.stringify(ssopRotatedCircuit)).toBe(before)
})
