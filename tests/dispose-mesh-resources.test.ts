import { expect, test } from "bun:test"
import * as THREE from "three"
import { disposeMeshResources } from "../src/utils/dispose-mesh-resources"

test("disposeMeshResources disposes geometry and a single material", () => {
  const geometry = new THREE.BoxGeometry()
  const material = new THREE.MeshStandardMaterial()
  const mesh = new THREE.Mesh(geometry, material)

  let geometryDisposed = false
  let materialDisposed = false
  geometry.addEventListener("dispose", () => {
    geometryDisposed = true
  })
  material.addEventListener("dispose", () => {
    materialDisposed = true
  })

  disposeMeshResources(mesh)

  expect(geometryDisposed).toBe(true)
  expect(materialDisposed).toBe(true)
})

test("disposeMeshResources disposes every material in a material array", () => {
  const geometry = new THREE.BoxGeometry()
  const materials: THREE.Material[] = [
    new THREE.MeshStandardMaterial(),
    new THREE.MeshBasicMaterial(),
  ]
  const mesh = new THREE.Mesh(geometry, materials)

  const disposedMaterials: THREE.Material[] = []
  for (const material of materials) {
    material.addEventListener("dispose", () => {
      disposedMaterials.push(material)
    })
  }

  disposeMeshResources(mesh)

  expect(disposedMaterials).toEqual(materials)
})
