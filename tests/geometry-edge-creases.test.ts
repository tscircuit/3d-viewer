import { expect, test } from "bun:test"
import { compareGeometryEdges } from "./fixtures/geometry-edge-comparison"

test.each([false, true])(
  "internal black crease differences are measured in either direction (reverse=%s)",
  (reverse) => {
    const makeImage = (crease: boolean) => {
      const data = new Uint8ClampedArray(24 * 24 * 4)
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 24; x++) {
          const body = x >= 3 && x <= 20 && y >= 3 && y <= 20
          const line = crease && x === 11 && y >= 7 && y <= 16
          const value = body && !line ? 255 : 0
          data.set([value, value, value, 255], (y * 24 + x) * 4)
        }
      }
      return { width: 24, height: 24, data }
    }
    const result = compareGeometryEdges(makeImage(reverse), makeImage(!reverse))
    expect(result.matches).toBe(false)
    expect(reverse ? result.unmatchedA : result.unmatchedB).toBe(22)
    expect(reverse ? result.unmatchedB : result.unmatchedA).toBe(0)
  },
)
