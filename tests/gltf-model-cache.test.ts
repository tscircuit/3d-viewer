import { expect, test } from "bun:test"
import * as THREE from "three"
import {
  cloneGltfSceneForInstance,
  normalizeGltfModelUrl,
} from "../src/utils/gltf-model-cache"

test("normalizes empty cachebust_origin from GLTF model URLs", () => {
  expect(
    normalizeGltfModelUrl(
      "https://modelcdn.tscircuit.com/model.glb?uuid=abc&cachebust_origin=",
    ),
  ).toBe("https://modelcdn.tscircuit.com/model.glb?uuid=abc")

  expect(normalizeGltfModelUrl("/model.glb?cachebust_origin=")).toBe(
    "/model.glb",
  )
})

test("clones GLTF scene materials per rendered instance", () => {
  const scene = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ opacity: 1 })
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
  scene.add(mesh)

  const firstInstance = cloneGltfSceneForInstance(scene)
  const secondInstance = cloneGltfSceneForInstance(scene)

  const firstMaterial = (firstInstance.children[0] as THREE.Mesh)
    .material as THREE.MeshStandardMaterial
  const secondMaterial = (secondInstance.children[0] as THREE.Mesh)
    .material as THREE.MeshStandardMaterial

  firstMaterial.opacity = 0.5

  expect(firstMaterial).not.toBe(material)
  expect(secondMaterial).not.toBe(material)
  expect(firstMaterial).not.toBe(secondMaterial)
  expect(secondMaterial.opacity).toBe(1)
})
