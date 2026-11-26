import { expect, test } from "bun:test"
import * as THREE from "three"
import {
  cloneModelInstance,
  getModelCacheKey,
  getModelFileExtension,
} from "../src/utils/load-model"

test("detects model extensions from the URL path before query and hash fragments", () => {
  expect(
    getModelFileExtension(
      "https://cdn.example.com/models/chip.glb?cachebust_origin=http%3A%2F%2Flocalhost#viewer",
    ),
  ).toBe("glb")
  expect(getModelFileExtension("/models/part.OBJ?version=1")).toBe("obj")
  expect(getModelFileExtension("/models/part.stl#mesh")).toBe("stl")
  expect(getModelFileExtension("/models/part.wrl?cachebust_origin=")).toBe(
    "wrl",
  )
})

test("normalizes cache keys by removing only cachebust_origin", () => {
  expect(
    getModelCacheKey(
      "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&cachebust_origin=https%3A%2F%2Ftscircuit.com&pn=C1",
    ),
  ).toBe(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C1",
  )

  expect(getModelCacheKey("/models/chip.glb?cachebust_origin=x&v=1")).toBe(
    "/models/chip.glb?v=1",
  )
  expect(getModelCacheKey("models/chip.glb?cachebust_origin=x&v=1")).toBe(
    "/models/chip.glb?v=1",
  )
})

test("clones cached model instances with independent materials", () => {
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
  const model = new THREE.Group()
  model.add(mesh)

  const clone = cloneModelInstance(model) as THREE.Group
  const clonedMesh = clone.children[0] as THREE.Mesh

  expect(clone).not.toBe(model)
  expect(clonedMesh).not.toBe(mesh)
  expect(clonedMesh.geometry).toBe(mesh.geometry)
  expect(clonedMesh.material).not.toBe(mesh.material)

  ;(clonedMesh.material as THREE.MeshStandardMaterial).opacity = 0.25
  expect((mesh.material as THREE.MeshStandardMaterial).opacity).toBe(1)
})
