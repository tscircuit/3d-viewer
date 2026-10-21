import { expect, test } from "bun:test"
import * as THREE from "three"
import {
  buildSectionCap,
  findSectionLoops,
  sectionPlane,
} from "../src/sections/section-geometry"

function positions(
  geometry: THREE.BufferGeometry,
  matrix = new THREE.Matrix4(),
) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  flat.applyMatrix4(matrix)
  return flat.getAttribute("position").array as Float32Array
}
function area(geometry: THREE.BufferGeometry) {
  const p = geometry.getAttribute("position")
  let area = 0
  for (let i = 0; i < p.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(p, i)
    const b = new THREE.Vector3().fromBufferAttribute(p, i + 1)
    const c = new THREE.Vector3().fromBufferAttribute(p, i + 2)
    area += b.sub(a).cross(c.sub(a)).length() / 2
  }
  return area
}
for (const axis of ["x", "y", "z"] as const)
  for (const flipped of [false, true]) {
    test(`cap closes a transformed box on ${axis}, flipped=${flipped}`, () => {
      const spec = { axis, offset: 4, flipped }
      const result = findSectionLoops({
        positions: positions(
          new THREE.BoxGeometry(4, 4, 4),
          new THREE.Matrix4().makeTranslation(4, 4, 4),
        ),
        ...spec,
      })
      expect(result.openChains).toBe(0)
      expect(result.loops).toHaveLength(1)
      const cap = buildSectionCap(result.loops, spec)
      expect(area(cap)).toBeCloseTo(16)
      const normals = cap.getAttribute("normal")
      expect(
        normals.getComponent(0, axis === "x" ? 0 : axis === "y" ? 1 : 2),
      ).toBeCloseTo(flipped ? 1 : -1)
      expect(
        sectionPlane(spec).distanceToPoint(new THREE.Vector3(4, 4, 4)),
      ).toBeCloseTo(0)
    })
  }
test("nested rings preserve a tube cavity and disconnected solids", () => {
  const loops: [number, number][][] = [
    [
      [-4, -4],
      [4, -4],
      [4, 4],
      [-4, 4],
    ],
    [
      [-2, -2],
      [-2, 2],
      [2, 2],
      [2, -2],
    ],
    [
      [10, 0],
      [12, 0],
      [12, 2],
      [10, 2],
    ],
  ]
  expect(
    area(buildSectionCap(loops, { axis: "z", offset: 0, flipped: false })),
  ).toBeCloseTo(52)
})
test("plane through cylinder vertices still forms a closed ring", () => {
  const result = findSectionLoops({
    positions: positions(new THREE.CylinderGeometry(3, 3, 5, 16)),
    axis: "z",
    offset: 0,
  })
  expect(result.openChains).toBe(0)
  expect(
    area(
      buildSectionCap(result.loops, { axis: "z", offset: 0, flipped: false }),
    ),
  ).toBeCloseTo(30)
})
test("open surface chains remain uncapped", () => {
  const result = findSectionLoops({
    positions: positions(new THREE.PlaneGeometry(4, 4)),
    axis: "x",
    offset: 0,
  })
  expect(result.loops).toHaveLength(0)
  expect(result.openChains).toBeGreaterThan(0)
})
test("offset outside solid creates no cap and leaves source untouched", () => {
  const source = positions(new THREE.BoxGeometry(4, 4, 4))
  const original = source.slice()
  expect(
    findSectionLoops({ positions: source, axis: "x", offset: 10 }).loops,
  ).toHaveLength(0)
  expect(source).toEqual(original)
})

test("tangent cut does not add a duplicate cap on an existing face", () => {
  expect(
    findSectionLoops({
      positions: positions(new THREE.BoxGeometry(4, 4, 4)),
      axis: "z",
      offset: 2,
    }).loops,
  ).toHaveLength(0)
})

test("worker loop function is self-contained after serialization", () => {
  const workerFunction = new Function(
    `return (${findSectionLoops.toString()})`,
  )()
  const input = {
    positions: positions(new THREE.BoxGeometry(4, 4, 4)),
    axis: "x",
    offset: 0,
  }
  expect(workerFunction(input)).toEqual(findSectionLoops(input as any))
})
