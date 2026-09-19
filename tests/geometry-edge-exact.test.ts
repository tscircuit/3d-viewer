import { expect, test } from "bun:test"
import { compareGeometryEdges } from "./fixtures/geometry-edge-comparison"

test("exact geometry preserves coordinates and produces opaque edge diagnostics", () => {
  const rows = [
    ".......",
    ".#####.",
    ".#####.",
    ".#####.",
    ".#####.",
    ".#####.",
    ".......",
  ]
  const data = new Uint8Array(
    rows.flatMap((row) =>
      [...row].flatMap((pixel) =>
        pixel === "#" ? [255, 255, 255, 255] : [0, 0, 0, 255],
      ),
    ),
  )
  const original = data.slice()
  const image = { width: 7, height: 7, data }
  const result = compareGeometryEdges(image, {
    ...image,
    data: new Uint8ClampedArray(data),
  })

  expect(result.matches).toBe(true)
  expect(result.reason).toBeUndefined()
  expect(result.tolerancePx).toBe(1.5)
  expect(result.edgeCountA).toBe(16)
  expect(result.edgeCountB).toBe(16)
  expect(result.unmatchedA).toBe(0)
  expect(result.unmatchedB).toBe(0)
  expect(result.unmatchedFractionA).toBe(0)
  expect(result.unmatchedFractionB).toBe(0)
  expect(result.edgeImageA).toBeInstanceOf(Uint8ClampedArray)
  expect(result.edgeImageB).toEqual(result.edgeImageA)
  expect(result.overlay).toBeInstanceOf(Uint8ClampedArray)
  expect(result.overlay.length).toBe(data.length)
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const offset = (y * 7 + x) * 4
      const edge =
        x >= 1 &&
        x <= 5 &&
        y >= 1 &&
        y <= 5 &&
        (x === 1 || x === 5 || y === 1 || y === 5)
      const value = edge ? 255 : 0
      const overlayValue = edge ? 160 : 0
      expect([...result.edgeImageA.slice(offset, offset + 4)]).toEqual([
        value,
        value,
        value,
        255,
      ])
      expect([...result.overlay.slice(offset, offset + 4)]).toEqual([
        overlayValue,
        overlayValue,
        overlayValue,
        255,
      ])
    }
  }
  expect(data).toEqual(original)
})
