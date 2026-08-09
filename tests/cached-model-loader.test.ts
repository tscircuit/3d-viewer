import { expect, test } from "bun:test"
import * as THREE from "three"
import {
  CachedModelLoader,
  normalizeModelCacheUrl,
} from "../src/utils/cached-model-loader"

test("normalizes empty cachebust_origin suffixes", () => {
  expect(normalizeModelCacheUrl("/model.obj&cachebust_origin=")).toBe(
    "/model.obj",
  )
})

test("deduplicates model loads while returning cloned instances", async () => {
  const loader = new CachedModelLoader()
  let loadCount = 0

  const sourceGeometry = new THREE.BoxGeometry()
  const sourceMaterial = new THREE.MeshStandardMaterial({ color: "red" })

  const [first, second] = await Promise.all([
    loader.load("/chip.obj", async () => {
      loadCount += 1
      return new THREE.Mesh(sourceGeometry, sourceMaterial)
    }),
    loader.load("/chip.obj", async () => {
      loadCount += 1
      return new THREE.Mesh(sourceGeometry, sourceMaterial)
    }),
  ])

  const third = await loader.load("/chip.obj", async () => {
    loadCount += 1
    return new THREE.Mesh(sourceGeometry, sourceMaterial)
  })

  expect(loadCount).toBe(1)
  expect(first).toBeInstanceOf(THREE.Mesh)
  expect(second).toBeInstanceOf(THREE.Mesh)
  expect(third).toBeInstanceOf(THREE.Mesh)
  expect(first).not.toBe(second)
  expect(second).not.toBe(third)
  expect((first as THREE.Mesh).geometry).not.toBe(
    (second as THREE.Mesh).geometry,
  )
  expect((first as THREE.Mesh).material).not.toBe(
    (second as THREE.Mesh).material,
  )
})
