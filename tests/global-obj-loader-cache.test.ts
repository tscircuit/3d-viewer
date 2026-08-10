import { expect, test } from "bun:test"
import * as THREE from "three"
import { cloneLoadedObject } from "../src/hooks/use-global-obj-loader"

test("cloneLoadedObject deep-clones cached meshes while reusing geometry", () => {
  const geometry = new THREE.BoxGeometry(1, 2, 3)
  const material = new THREE.MeshStandardMaterial({ color: "red" })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = "cached-mesh"

  const source = new THREE.Group()
  source.add(mesh)

  const firstClone = cloneLoadedObject(source) as THREE.Group
  const secondClone = cloneLoadedObject(source) as THREE.Group
  const firstMesh = firstClone.children[0] as THREE.Mesh
  const secondMesh = secondClone.children[0] as THREE.Mesh

  expect(firstClone).not.toBe(source)
  expect(firstMesh).not.toBe(mesh)
  expect(secondMesh).not.toBe(firstMesh)
  expect(firstMesh.geometry).toBe(geometry)
  expect(secondMesh.geometry).toBe(geometry)
  expect(firstMesh.material).not.toBe(material)
  expect(secondMesh.material).not.toBe(material)
  expect(secondMesh.material).not.toBe(firstMesh.material)
})
