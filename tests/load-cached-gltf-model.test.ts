import { expect, test } from "bun:test"
import * as THREE from "three"
import { cloneModelForInstance } from "../src/utils/load-cached-gltf-model"

test("cloneModelForInstance clones mesh materials for independent hover/translucency state", () => {
  const source = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
  source.add(mesh)

  const firstClone = cloneModelForInstance(source)
  const secondClone = cloneModelForInstance(source)

  const firstMesh = firstClone.children[0] as THREE.Mesh
  const secondMesh = secondClone.children[0] as THREE.Mesh

  expect(firstMesh).not.toBe(mesh)
  expect(firstMesh.material).not.toBe(material)
  expect(secondMesh.material).not.toBe(material)
  expect(firstMesh.material).not.toBe(secondMesh.material)

  ;(firstMesh.material as THREE.MeshStandardMaterial).opacity = 0.5
  expect((secondMesh.material as THREE.MeshStandardMaterial).opacity).toBe(1)
})
