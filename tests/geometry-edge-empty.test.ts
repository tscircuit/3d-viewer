import { expect, test } from "bun:test"
import { compareGeometryEdges } from "./fixtures/geometry-edge-comparison"

test.each([
  { foregroundA: false, foregroundB: false },
  { foregroundA: true, foregroundB: false },
  { foregroundA: false, foregroundB: true },
])(
  "empty edge maps never match (foreground A=$foregroundA, B=$foregroundB)",
  ({ foregroundA, foregroundB }) => {
    const makeImage = (foreground: boolean) => {
      // Invisible white RGB must composite to empty black, not geometry.
      const data = new Uint8ClampedArray(9 * 9 * 4).fill(255)
      for (let i = 0; i < 9 * 9; i++) data[i * 4 + 3] = 0
      if (foreground) data[40 * 4 + 3] = 255
      return { width: 9, height: 9, data }
    }
    const result = compareGeometryEdges(
      makeImage(foregroundA),
      makeImage(foregroundB),
      { maxDistancePx: Number.MAX_VALUE, maxUnmatchedFraction: 1 },
    )
    expect(result.matches).toBe(false)
    expect(result.reason).toContain("has no geometry edges")
    expect(result.edgeCountA).toBe(foregroundA ? 1 : 0)
    expect(result.edgeCountB).toBe(foregroundB ? 1 : 0)
    expect(result.unmatchedA).toBe(foregroundA ? 1 : 0)
    expect(result.unmatchedB).toBe(foregroundB ? 1 : 0)
    expect(result.unmatchedFractionA).toBe(foregroundA ? 1 : 0)
    expect(result.unmatchedFractionB).toBe(foregroundB ? 1 : 0)
  },
)
