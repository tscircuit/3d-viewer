import { expect, test } from "bun:test"
import { compareGeometryEdges } from "./fixtures/geometry-edge-comparison"

test.each([
  { intensity: 255, alpha: 255, foreground: true },
  { intensity: 128, alpha: 255, foreground: true },
  { intensity: 127, alpha: 255, foreground: false },
  { intensity: 255, alpha: 128, foreground: true },
  { intensity: 255, alpha: 127, foreground: false },
  { intensity: 255, alpha: 0, foreground: false },
])(
  "fixed threshold composites intensity=$intensity alpha=$alpha over black",
  ({ intensity, alpha, foreground }) => {
    const a = new Uint8ClampedArray(5 * 5 * 4)
    const b = new Uint8ClampedArray(a.length)
    a.set([255, 255, 255, 255], 12 * 4)
    b.set([intensity, intensity, intensity, alpha], 12 * 4)
    const result = compareGeometryEdges(
      { width: 5, height: 5, data: a },
      { width: 5, height: 5, data: b },
    )
    expect(result.matches).toBe(foreground)
    expect(result.edgeCountA).toBe(1)
    expect(result.edgeCountB).toBe(foreground ? 1 : 0)
  },
)
