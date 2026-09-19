import { expect, test } from "bun:test"
import { compareGeometryEdges } from "./fixtures/geometry-edge-comparison"

test.each(["rotate", "flip"])(
  "an asymmetric bracket must not match after a %s",
  (transform) => {
    const data = new Uint8ClampedArray(24 * 24 * 4)
    const changed = new Uint8ClampedArray(data.length)
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        const upright = x >= 4 && x <= 7 && y >= 4 && y <= 18
        const foot = x >= 4 && x <= 16 && y >= 15 && y <= 18
        const value = upright || foot ? 255 : 0
        const pixel = [value, value, value, 255]
        data.set(pixel, (y * 24 + x) * 4)
        const tx = 23 - (transform === "rotate" ? y : x)
        const ty = transform === "rotate" ? x : y
        changed.set(pixel, (ty * 24 + tx) * 4)
      }
    }
    const result = compareGeometryEdges(
      { width: 24, height: 24, data },
      { width: 24, height: 24, data: changed },
    )
    expect(result.edgeCountA).toBe(result.edgeCountB)
    expect(result.matches).toBe(false)
    expect(result.unmatchedFractionA).toBeGreaterThan(0.2)
    expect(result.unmatchedFractionB).toBeGreaterThan(0.2)
  },
)
