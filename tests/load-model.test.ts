import { expect, test } from "bun:test"
import * as THREE from "three"
import {
  cloneModelForUse,
  getModelExtension,
  normalizeModelCacheKey,
} from "../src/utils/load-model"

test("detects model extensions before query strings and hashes", () => {
  expect(getModelExtension("/models/chip.glb?cachebust_origin=abc")).toBe("glb")
  expect(getModelExtension("https://cdn.example.com/part.OBJ#preview")).toBe(
    "obj",
  )
  expect(getModelExtension("model.stl?download=1#mesh")).toBe("stl")
})

test("normalizes cachebust_origin without dropping meaningful query params", () => {
  expect(
    normalizeModelCacheKey(
      "https://cdn.example.com/model.glb?cachebust_origin=one&variant=blue#top",
    ),
  ).toBe("https://cdn.example.com/model.glb?variant=blue#top")
  expect(
    normalizeModelCacheKey(
      "/models/chip.obj?variant=blue&cachebust_origin=two",
    ),
  ).toBe("/models/chip.obj?variant=blue")
  expect(normalizeModelCacheKey("models/chip.wrl?cachebust_origin=three")).toBe(
    "models/chip.wrl",
  )
})

test("clones model materials so cached templates are not mutated per instance", () => {
  const material = new THREE.MeshStandardMaterial({ color: "red" })
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
  const group = new THREE.Group()
  group.add(mesh)

  const cloned = cloneModelForUse(group)
  const clonedMesh = cloned.children[0] as THREE.Mesh

  expect(cloned).not.toBe(group)
  expect(clonedMesh.geometry).toBe(mesh.geometry)
  expect(clonedMesh.material).not.toBe(material)

  ;(clonedMesh.material as THREE.MeshStandardMaterial).opacity = 0.25
  expect(material.opacity).toBe(1)
})
