import { expect, test } from "bun:test"
import * as THREE from "three"
import {
  cloneLoadedModel,
  getModelCacheKey,
  getModelExtension,
} from "../src/utils/load-model"

test("getModelCacheKey removes only cachebust_origin", () => {
  expect(
    getModelCacheKey(
      "https://modelcdn.tscircuit.com/model.obj?uuid=abc&cachebust_origin=&pn=C1",
    ),
  ).toBe("https://modelcdn.tscircuit.com/model.obj?uuid=abc&pn=C1")

  expect(getModelCacheKey("/models/chip.glb?cachebust_origin=123")).toBe(
    "/models/chip.glb",
  )
})

test("getModelExtension ignores query strings", () => {
  expect(
    getModelExtension("https://example.com/model.obj?cachebust_origin="),
  ).toBe("obj")
  expect(getModelExtension("/models/chip.glb?version=1")).toBe("glb")
})

test("cloneLoadedModel clones materials so cached instances can be styled independently", () => {
  const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)

  const cloned = cloneLoadedModel(mesh) as THREE.Mesh

  expect(cloned).not.toBe(mesh)
  expect(cloned.geometry).toBe(mesh.geometry)
  expect(cloned.material).not.toBe(mesh.material)
})
