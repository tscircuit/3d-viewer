import { expect, test } from "bun:test"
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
} from "three"
import {
  cloneObject3DForLoaderCache,
  getGlobalObjLoaderCacheKey,
} from "../src/hooks/use-global-obj-loader"

test("normalizes cachebust_origin out of OBJ loader cache keys", () => {
  expect(
    getGlobalObjLoaderCacheKey(
      "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&cachebust_origin=https%3A%2F%2Ftscircuit.com&pn=C123",
    ),
  ).toBe(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C123",
  )

  expect(
    getGlobalObjLoaderCacheKey(
      "/models/chip.obj?cachebust_origin=http%3A%2F%2Flocalhost%3A6006#mesh",
    ),
  ).toBe("/models/chip.obj#mesh")
})

test("clones cached loader objects with independent materials", () => {
  const geometry = new BoxGeometry(1, 1, 1)
  const sourceMaterial = new MeshStandardMaterial({ opacity: 1 })
  const source = new Group()
  source.add(new Mesh(geometry, sourceMaterial))

  const firstClone = cloneObject3DForLoaderCache(source) as Group
  const secondClone = cloneObject3DForLoaderCache(source) as Group

  const firstMesh = firstClone.children[0] as Mesh
  const secondMesh = secondClone.children[0] as Mesh
  const firstMaterial = firstMesh.material as MeshStandardMaterial
  const secondMaterial = secondMesh.material as MeshStandardMaterial

  firstMaterial.opacity = 0.25
  firstMaterial.transparent = true

  expect(firstMaterial).not.toBe(secondMaterial)
  expect(firstMaterial).not.toBe(sourceMaterial)
  expect(secondMaterial.opacity).toBe(1)
  expect(secondMaterial.transparent).toBe(false)
  expect(sourceMaterial.opacity).toBe(1)
})

test("clones material arrays for cached loader objects", () => {
  const source = new Group()
  source.add(
    new Mesh(new BoxGeometry(1, 1, 1), [
      new MeshBasicMaterial({ color: "red" }),
      new MeshBasicMaterial({ color: "blue" }),
    ]),
  )

  const clone = cloneObject3DForLoaderCache(source) as Group
  const sourceMaterials = (source.children[0] as Mesh)
    .material as MeshBasicMaterial[]
  const clonedMaterials = (clone.children[0] as Mesh)
    .material as MeshBasicMaterial[]

  expect(clonedMaterials).toHaveLength(2)
  expect(clonedMaterials[0]).not.toBe(sourceMaterials[0])
  expect(clonedMaterials[1]).not.toBe(sourceMaterials[1])
})
