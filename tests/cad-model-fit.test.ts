import { expect, test } from "bun:test"
import * as THREE from "three"
import { getCadModelFitScale } from "../src/utils/cad-model-fit"

test("contain_within_bounds uses a uniform fit scale", () => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 8))

  const scale = getCadModelFitScale(mesh, [10, 10, 10], "contain_within_bounds")

  expect(scale[0]).toBeCloseTo(1.25)
  expect(scale[1]).toBeCloseTo(1.25)
  expect(scale[2]).toBeCloseTo(1.25)
})

test("fill_bounds uses axis-specific fit scale", () => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 8))

  const scale = getCadModelFitScale(mesh, [10, 10, 10], "fill_bounds")

  expect(scale[0]).toBeCloseTo(5)
  expect(scale[1]).toBeCloseTo(2.5)
  expect(scale[2]).toBeCloseTo(1.25)
})

test("fit ignores outer parent scaling when measuring the model subtree", () => {
  const parent = new THREE.Group()
  parent.scale.set(100, 100, 100)

  const child = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 8))
  parent.add(child)

  const scale = getCadModelFitScale(child, [10, 10, 10], "fill_bounds")

  expect(scale[0]).toBeCloseTo(5)
  expect(scale[1]).toBeCloseTo(2.5)
  expect(scale[2]).toBeCloseTo(1.25)
})

test("fit includes loader transform group rotation in measured bounds", () => {
  const modelTransformGroup = new THREE.Group()
  const loaderTransformGroup = new THREE.Group()
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 8))

  modelTransformGroup.add(loaderTransformGroup)
  loaderTransformGroup.add(mesh)
  loaderTransformGroup.rotation.x = Math.PI / 2

  const scale = getCadModelFitScale(
    modelTransformGroup,
    [10, 10, 10],
    "fill_bounds",
  )

  expect(scale[0]).toBeCloseTo(5)
  expect(scale[1]).toBeCloseTo(1.25)
  expect(scale[2]).toBeCloseTo(2.5)
})
