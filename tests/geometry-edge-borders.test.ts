import { expect, test } from "bun:test"
import { compareGeometryEdges } from "./fixtures/geometry-edge-comparison"

test.each([
  { x: 0, y: 4, clipped: true },
  { x: 8, y: 4, clipped: true },
  { x: 4, y: 0, clipped: true },
  { x: 4, y: 8, clipped: true },
  { x: 0, y: 0, clipped: true },
  { x: 1, y: 1, clipped: false },
  { x: 7, y: 7, clipped: false },
])(
  "identical geometry at ($x, $y) diagnoses clipping=$clipped",
  ({ x, y, clipped }) => {
    const data = new Uint8ClampedArray(9 * 9 * 4)
    data.set([255, 255, 255, 255], (y * 9 + x) * 4)
    const image = { width: 9, height: 9, data }
    const result = compareGeometryEdges(image, image, {
      maxUnmatchedFraction: 1,
    })
    expect(result.matches).toBe(!clipped)
    expect(result.edgeCountA).toBe(1)
    expect(result.edgeCountB).toBe(1)
    expect(result.unmatchedA).toBe(0)
    expect(result.unmatchedB).toBe(0)
    if (clipped) {
      expect(result.reason).toContain(
        "Image A geometry touches the image border",
      )
      expect(result.reason).toContain(
        "Image B geometry touches the image border",
      )
    } else {
      expect(result.reason).toBeUndefined()
    }
  },
)
