import { expect, test } from "bun:test"
import * as THREE from "three"
import { cloneSceneWithIndependentMaterials } from "../src/utils/gltf-model-cache"

test("clones cached scenes with independent material instances", () => {
  const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
  const original = new THREE.Group()
  original.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material))

  const firstClone = cloneSceneWithIndependentMaterials(original)
  const secondClone = cloneSceneWithIndependentMaterials(original)
  const firstMesh = firstClone.children[0] as THREE.Mesh
  const secondMesh = secondClone.children[0] as THREE.Mesh

  expect(firstMesh.material).not.toBe(material)
  expect(secondMesh.material).not.toBe(material)
  expect(firstMesh.material).not.toBe(secondMesh.material)
})
