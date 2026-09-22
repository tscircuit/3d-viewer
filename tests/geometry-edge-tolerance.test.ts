import { expect, test } from "bun:test"
import { compareGeometryEdges } from "./fixtures/geometry-edge-comparison"

test.each([
  { dx: 0, dy: 0, tolerance: 0, matches: true },
  { dx: 1, dy: 0, tolerance: 1, matches: true },
  { dx: 1, dy: 1, tolerance: 1.5, matches: true },
  { dx: 1, dy: 1, tolerance: 1.4, matches: false },
  { dx: 2, dy: 0, tolerance: 1.5, matches: false },
  { dx: 3, dy: 2, tolerance: 1.5, matches: false },
])(
  "fixed pixel coverage for shift ($dx, $dy) at tolerance $tolerance",
  ({ dx, dy, tolerance, matches }) => {
    const makeImage = (
      shiftX: number,
      shiftY: number,
      antialiased: boolean,
    ) => {
      const data = new Uint8ClampedArray(16 * 16 * 4)
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const localX = x - shiftX
          const localY = y - shiftY
          const inside =
            localX >= 4 && localX <= 8 && localY >= 4 && localY <= 10
          const fringe =
            localX >= 3 && localX <= 9 && localY >= 3 && localY <= 11
          const value = inside ? (antialiased ? 210 : 255) : 0
          // A sub-threshold fringe does not create extra geometry.
          const intensity = antialiased && fringe && !inside ? 90 : value
          data.set([intensity, intensity, intensity, 255], (y * 16 + x) * 4)
        }
      }
      return { width: 16, height: 16, data }
    }
    const result = compareGeometryEdges(
      makeImage(0, 0, false),
      makeImage(dx, dy, true),
      { maxDistancePx: tolerance, maxUnmatchedFraction: 0 },
    )
    expect(result.matches).toBe(matches)
    if (matches) {
      expect(result.unmatchedA).toBe(0)
      expect(result.unmatchedB).toBe(0)
    } else {
      expect(result.unmatchedA).toBeGreaterThan(0)
      expect(result.unmatchedB).toBeGreaterThan(0)
    }
  },
)
