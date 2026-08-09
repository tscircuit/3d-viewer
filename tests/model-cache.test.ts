import { expect, test } from "bun:test"
import * as THREE from "three"
import {
  loadCachedModel,
  normalizeModelCacheUrl,
} from "../src/utils/model-cache"

test("normalizes model URLs by removing cachebust_origin", () => {
  expect(
    normalizeModelCacheUrl(
      "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&cachebust_origin=http%3A%2F%2Flocalhost%3A3020&pn=C123",
    ),
  ).toBe(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C123",
  )

  expect(
    normalizeModelCacheUrl(
      "/models/chip.obj?cachebust_origin=http%3A%2F%2Flocalhost%3A3020&v=1#mesh",
    ),
  ).toBe("/models/chip.obj?v=1#mesh")
})

test("loadCachedModel reuses a normalized URL and returns isolated clones", async () => {
  const source = new THREE.Group()
  source.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xff0000 }),
    ),
  )

  let loadCount = 0
  const baseUrl = `/models/shared-${Date.now()}.obj`

  const first = await loadCachedModel(
    `${baseUrl}?cachebust_origin=http%3A%2F%2Flocalhost%3A3020`,
    async (normalizedUrl) => {
      loadCount += 1
      expect(normalizedUrl).toBe(baseUrl)
      return source
    },
  )

  const second = await loadCachedModel(
    `${baseUrl}?cachebust_origin=http%3A%2F%2Fexample.com`,
    async () => {
      loadCount += 1
      return new THREE.Group()
    },
  )

  expect(loadCount).toBe(1)
  expect(first).not.toBe(source)
  expect(second).not.toBe(source)
  expect(first).not.toBe(second)

  const firstMesh = first.children[0] as THREE.Mesh
  const secondMesh = second.children[0] as THREE.Mesh
  const firstMaterial = firstMesh.material as THREE.MeshStandardMaterial
  const secondMaterial = secondMesh.material as THREE.MeshStandardMaterial

  firstMaterial.opacity = 0.25

  expect(firstMaterial).not.toBe(secondMaterial)
  expect(secondMaterial.opacity).toBe(1)
})
