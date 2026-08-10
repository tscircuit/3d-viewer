import { expect, test } from "bun:test"
import * as THREE from "three"
import {
  cloneObjModelForScene,
  getObjModelCacheKey,
} from "../src/utils/obj-model-cache"

test("normalizes modelcdn cachebust_origin query params", () => {
  const first = getObjModelCacheKey(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C123&cachebust_origin=https%3A%2F%2Ftscircuit.com",
  )
  const second = getObjModelCacheKey(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C123&cachebust_origin=http%3A%2F%2Flocalhost%3A3020",
  )

  expect(first).toBe(second)
  expect(first).toBe(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C123",
  )
})

test("normalizes empty cachebust_origin query params", () => {
  expect(
    getObjModelCacheKey(
      "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C123&cachebust_origin=",
    ),
  ).toBe(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C123",
  )
})

test("keeps independent material instances for cloned cached models", () => {
  const templateMaterial = new THREE.MeshStandardMaterial({ opacity: 1 })
  const template = new THREE.Group()
  template.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), templateMaterial))

  const first = cloneObjModelForScene(template)
  const second = cloneObjModelForScene(template)
  const firstMesh = first.children[0] as THREE.Mesh
  const secondMesh = second.children[0] as THREE.Mesh
  const firstMaterial = firstMesh.material as THREE.Material
  const secondMaterial = secondMesh.material as THREE.Material

  firstMaterial.opacity = 0.5

  expect(first).not.toBe(template)
  expect(firstMaterial).not.toBe(templateMaterial)
  expect(firstMaterial).not.toBe(secondMaterial)
  expect(secondMaterial.opacity).toBe(1)
})
