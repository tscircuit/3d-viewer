import { expect, test } from "bun:test"
import { compareGeometryEdges } from "./fixtures/geometry-edge-comparison"

test.each(["A", "B"])(
  "an extra isolated feature in image %s fails its own directional threshold",
  (extraSide) => {
    const makeImage = (extra: boolean) => {
      const data = new Uint8ClampedArray(24 * 20 * 4)
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 24; x++) {
          const body = x >= 3 && x <= 11 && y >= 3 && y <= 15
          const feature = extra && x === 19 && y === 9
          const value = body || feature ? 255 : 0
          data.set([value, value, value, 255], (y * 24 + x) * 4)
        }
      }
      return { width: 24, height: 20, data }
    }
    const a = makeImage(extraSide === "A")
    const b = makeImage(extraSide === "B")
    const result = compareGeometryEdges(a, b)
    const fraction =
      extraSide === "A" ? result.unmatchedFractionA : result.unmatchedFractionB
    expect(result.matches).toBe(false)
    expect(result.reason).toContain(`Image ${extraSide} unmatched`)
    expect(result.edgeCountA).toBe(extraSide === "A" ? 41 : 40)
    expect(result.edgeCountB).toBe(extraSide === "B" ? 41 : 40)
    expect(result.unmatchedA).toBe(extraSide === "A" ? 1 : 0)
    expect(result.unmatchedB).toBe(extraSide === "B" ? 1 : 0)
    expect(fraction).toBe(1 / 41)
    expect([
      ...result.overlay.slice((9 * 24 + 19) * 4, (9 * 24 + 20) * 4),
    ]).toEqual(extraSide === "A" ? [255, 64, 64, 255] : [0, 200, 255, 255])
    // A mean would pass here, although one direction exceeds the limit.
    expect(
      compareGeometryEdges(a, b, { maxUnmatchedFraction: 0.02 }).matches,
    ).toBe(false)
    expect(
      compareGeometryEdges(a, b, { maxUnmatchedFraction: fraction }).matches,
    ).toBe(true)
    expect(
      compareGeometryEdges(a, b, {
        maxUnmatchedFraction: fraction - Number.EPSILON,
      }).matches,
    ).toBe(false)
  },
)
