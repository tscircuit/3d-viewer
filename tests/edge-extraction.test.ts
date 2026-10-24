import { expect, test } from "bun:test"
import * as THREE from "three"
import jscad from "@jscad/modeling"
import { executeJscadOperations } from "jscad-planner"
import { convertCSGToThreeGeom } from "jscad-electronics/vanilla"
import { lampParts } from "../stories/edge-display/lamp"
import { extractModelEdges } from "../src/utils/extract-model-edges"

const triangles = (points: number[]) =>
  new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points, 3),
  )

test("coplanar T-junctions disappear while the outer boundary remains", () => {
  const geometry = triangles([
    0, 0, 0, 2, 0, 0, 0, 2, 0, 2, 0, 0, 2, 2, 0, 1, 1, 0, 1, 1, 0, 2, 2, 0, 0,
    2, 0,
  ])
  const edges = extractModelEdges(geometry)
  expect(edges.length).toBe(4 * 6)
  for (let offset = 0; offset < edges.length; offset += 6) {
    const [ax, ay, , bx, by] = edges.slice(offset, offset + 6)
    expect(ax === bx || ay === by).toBe(true)
  }
})

test("partial coplanar seams retain the exposed portions of the long boundary", () => {
  const geometry = triangles([
    0, 0, 0, 4, 0, 0, 0, 2, 0, 3, 0, 0, 1, 0, 0, 2, -1, 0,
  ])
  const edges = extractModelEdges(geometry)
  const baseIntervals: number[][] = []
  for (let offset = 0; offset < edges.length; offset += 6) {
    if (edges[offset + 1] === 0 && edges[offset + 4] === 0) {
      baseIntervals.push([edges[offset]!, edges[offset + 3]!].sort())
    }
  }
  expect(baseIntervals).toEqual([
    [0, 1],
    [3, 4],
  ])
})

test("T-junction edges between angled faces remain visible", () => {
  const geometry = triangles([
    0, 0, 0, 4, 0, 0, 0, 2, 0, 4, 0, 0, 2, 0, 0, 4, 0, 2, 2, 0, 0, 0, 0, 0, 4,
    0, 2,
  ])
  const edges = extractModelEdges(geometry)
  let hasLongCrease = false
  for (let offset = 0; offset < edges.length; offset += 6) {
    if (
      edges[offset] === 0 &&
      edges[offset + 1] === 0 &&
      edges[offset + 2] === 0 &&
      edges[offset + 3] === 4 &&
      edges[offset + 4] === 0 &&
      edges[offset + 5] === 0
    )
      hasLongCrease = true
  }
  expect(hasLongCrease).toBe(true)
})

test("conforming cube creases and draw ranges match the existing edge policy", () => {
  const geometry = new THREE.BoxGeometry()
  expect(extractModelEdges(geometry).length).toBe(12 * 6)
  geometry.setDrawRange(0, 3)
  expect(extractModelEdges(geometry).length).toBe(3 * 6)
  geometry.setDrawRange(0, 0)
  expect(extractModelEdges(geometry).length).toBe(0)
})

test("raw lamp CSG retains ring edges without the false diagonals across its top", () => {
  const geometry = convertCSGToThreeGeom(
    executeJscadOperations(jscad as any, lampParts[0]!.plan),
  )
  const sourcePositions = geometry.getAttribute("position").array.slice()
  const edges = extractModelEdges(geometry)
  let ringEdges = 0
  for (let offset = 0; offset < edges.length; offset += 6) {
    const topSurface =
      Math.abs(edges[offset + 2]! - edges[offset + 5]!) < 0.0001 &&
      (Math.abs(edges[offset + 2]! - 8) < 0.0001 ||
        Math.abs(edges[offset + 2]! - 12) < 0.0001)
    if (!topSurface) continue
    ringEdges++
    const startRadius = Math.hypot(edges[offset]!, edges[offset + 1]!)
    const endRadius = Math.hypot(edges[offset + 3]!, edges[offset + 4]!)
    expect(Math.abs(startRadius - endRadius)).toBeLessThan(0.25)
  }
  expect(ringEdges).toBeGreaterThan(0)
  expect(geometry.getAttribute("position").array).toEqual(sourcePositions)
  geometry.dispose()
})
