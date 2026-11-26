import { expect, test } from "bun:test"
import * as THREE from "three"
import { createFlexMeshes } from "../src/utils/flex-meshes"
import { rectangularFlexFloat32Boundary } from "../stories/fixtures/rectangular-flex-float32-boundary"

function boardMesh() {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(12, 8.6, 0.12))
  mesh.name = "board-geom"
  return mesh
}

// Reproduction-only: this asserts today's erroneous behavior, not the intended
// contract. Replace with a successful-fold assertion when the bug is fixed.
test("repro: an exact-edge rectangular fold rejects Float32 board vertices", () => {
  expect(Math.fround(4.3) - 4.3).toBeGreaterThan(1e-7)
  expect(() =>
    createFlexMeshes([boardMesh()], [], rectangularFlexFloat32Boundary(), true),
  ).toThrow("must span the full board cross-section through its bend zone")
})

test("control: extending only the bend axis avoids the error", () => {
  expect(() =>
    createFlexMeshes(
      [boardMesh()],
      [],
      rectangularFlexFloat32Boundary(0.05),
      true,
    ),
  ).not.toThrow()
})

test("control: the same rectangle with an explicit outline already folds", () => {
  const circuit = rectangularFlexFloat32Boundary()
  Object.assign(circuit[0]!, {
    outline: [
      { x: -6, y: -4.3 },
      { x: 6, y: -4.3 },
      { x: 6, y: 4.3 },
      { x: -6, y: 4.3 },
    ],
  })
  expect(() => createFlexMeshes([boardMesh()], [], circuit, true)).not.toThrow()
})
