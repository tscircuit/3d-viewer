import { expect, test } from "bun:test"
import { compareGeometryEdges } from "./fixtures/geometry-edge-comparison"

test.each([0, 0.9, 1, 1.4, Math.SQRT2, 1.5, 2, 3.5, 100, Number.MAX_VALUE])(
  "bounded row matching agrees with brute-force Euclidean distance at %s pixels",
  (maxDistancePx) => {
    const rowsA = [
      "............",
      "..###.......",
      "..###...#...",
      "..###.......",
      "......#.....",
      "......#.....",
      "..#...####..",
      "............",
    ]
    const rowsB = [
      "............",
      "...###......",
      "...###......",
      "...###...#..",
      "............",
      ".....#......",
      ".....####...",
      "............",
    ]
    const image = (rows: string[]) => ({
      width: 12,
      height: 8,
      data: new Uint8Array(
        rows.flatMap((row) =>
          [...row].flatMap((pixel) =>
            pixel === "#" ? [255, 255, 255, 255] : [0, 0, 0, 255],
          ),
        ),
      ),
    })
    const a = image(rowsA)
    const b = image(rowsB)
    const result = compareGeometryEdges(a, b, {
      maxDistancePx,
      maxUnmatchedFraction: 0,
    })
    const points = (edgeImage: Uint8ClampedArray) => {
      const positions: { x: number; y: number }[] = []
      for (let i = 0; i < edgeImage.length; i += 4) {
        if (edgeImage[i]) {
          positions.push({ x: (i / 4) % 12, y: Math.floor(i / 4 / 12) })
        }
      }
      return positions
    }
    const pointsA = points(result.edgeImageA)
    const pointsB = points(result.edgeImageB)
    const countUnmatched = (source: typeof pointsA, target: typeof pointsA) =>
      source.filter(
        (point) =>
          !target.some(
            (other) =>
              Math.hypot(point.x - other.x, point.y - other.y) <= maxDistancePx,
          ),
      ).length
    const expectedA = countUnmatched(pointsA, pointsB)
    const expectedB = countUnmatched(pointsB, pointsA)
    expect(result.unmatchedA).toBe(expectedA)
    expect(result.unmatchedB).toBe(expectedB)
    expect(result.unmatchedFractionA).toBe(expectedA / pointsA.length)
    expect(result.unmatchedFractionB).toBe(expectedB / pointsB.length)
    expect(result.matches).toBe(expectedA === 0 && expectedB === 0)

    const reversed = compareGeometryEdges(b, a, {
      maxDistancePx,
      maxUnmatchedFraction: 0,
    })
    expect(reversed.matches).toBe(result.matches)
    expect(reversed.unmatchedA).toBe(result.unmatchedB)
    expect(reversed.unmatchedB).toBe(result.unmatchedA)
    expect(reversed.edgeImageA).toEqual(result.edgeImageB)
    expect(reversed.edgeImageB).toEqual(result.edgeImageA)
  },
)
