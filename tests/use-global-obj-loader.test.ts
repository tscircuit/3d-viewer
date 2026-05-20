import { expect, test } from "bun:test"
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from "three"
import {
  cloneObject3DForModelInstance,
  getModelLoaderCacheKey,
} from "../src/hooks/use-global-obj-loader"

test("normalizes cachebust_origin without dropping meaningful query params", () => {
  expect(getModelLoaderCacheKey("/models/chip.obj?cachebust_origin=abc")).toBe(
    "/models/chip.obj",
  )
  expect(
    getModelLoaderCacheKey(
      "/models/chip.obj?variant=small&cachebust_origin=abc",
    ),
  ).toBe("/models/chip.obj?variant=small")
  expect(getModelLoaderCacheKey("models/chip.obj?cachebust_origin=abc")).toBe(
    "models/chip.obj",
  )
  expect(
    getModelLoaderCacheKey(
      "https://cdn.example.com/chip.wrl?cachebust_origin=abc&variant=small#mesh",
    ),
  ).toBe("https://cdn.example.com/chip.wrl?variant=small#mesh")
})

test("clones cached Object3D instances with independent materials", () => {
  const sourceMaterial = new MeshBasicMaterial({
    opacity: 1,
    transparent: false,
  })
  const sourceMesh = new Mesh(new BoxGeometry(1, 1, 1), sourceMaterial)
  const source = new Group()
  source.add(sourceMesh)

  const clone = cloneObject3DForModelInstance(source)
  const clonedMesh = clone.children[0] as Mesh
  const clonedMaterial = clonedMesh.material as MeshBasicMaterial

  expect(clonedMaterial).not.toBe(sourceMaterial)

  clonedMaterial.transparent = true
  clonedMaterial.opacity = 0.4

  expect(sourceMaterial.transparent).toBe(false)
  expect(sourceMaterial.opacity).toBe(1)
})
