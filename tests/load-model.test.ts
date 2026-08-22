import { expect, test } from "bun:test"
import * as THREE from "three"
import {
  cloneModelForUse,
  getModelCacheKey,
  getModelExtensionFromUrl,
} from "src/utils/load-model"

test("detects model extensions from URLs with query strings and hashes", () => {
  expect(
    getModelExtensionFromUrl(
      "https://modelcdn.tscircuit.com/packages/model.glb?cachebust_origin=abc#viewer",
    ),
  ).toBe("glb")
  expect(getModelExtensionFromUrl("/models/part.obj?version=1")).toBe("obj")
  expect(getModelExtensionFromUrl("part.stl#section")).toBe("stl")
})

test("normalizes cachebust_origin without dropping meaningful query params", () => {
  expect(
    getModelCacheKey(
      "https://modelcdn.tscircuit.com/download?uuid=123&cachebust_origin=abc&pn=C1",
    ),
  ).toBe("https://modelcdn.tscircuit.com/download?uuid=123&pn=C1")
  expect(getModelCacheKey("/models/part.glb?cachebust_origin=abc")).toBe(
    "models/part.glb",
  )
})

test("clones model geometry and materials for independent instances", () => {
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const mesh = new THREE.Mesh(geometry, material)
  const group = new THREE.Group()
  group.add(mesh)

  const clone = cloneModelForUse(group)
  const clonedMesh = clone.children[0] as THREE.Mesh

  expect(clone).not.toBe(group)
  expect(clonedMesh.geometry).not.toBe(geometry)
  expect(clonedMesh.material).not.toBe(material)
})
