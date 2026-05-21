import { expect, test } from "bun:test"
import * as THREE from "three"
import { disposeErrorFallbackMesh } from "../src/utils/dispose-error-fallback-mesh"

test("disposeErrorFallbackMesh disposes the owned geometry and material", () => {
  const geometry = new THREE.BufferGeometry()
  const material = new THREE.MeshStandardMaterial()
  let geometryDisposeCount = 0
  let materialDisposeCount = 0
  geometry.dispose = () => {
    geometryDisposeCount += 1
  }
  material.dispose = () => {
    materialDisposeCount += 1
  }

  disposeErrorFallbackMesh(new THREE.Mesh(geometry, material))

  expect(geometryDisposeCount).toBe(1)
  expect(materialDisposeCount).toBe(1)
})

test("disposeErrorFallbackMesh disposes material arrays", () => {
  const geometry = new THREE.BufferGeometry()
  const materials = [
    new THREE.MeshStandardMaterial(),
    new THREE.MeshStandardMaterial(),
  ]
  let geometryDisposeCount = 0
  let materialDisposeCount = 0
  geometry.dispose = () => {
    geometryDisposeCount += 1
  }
  for (const material of materials) {
    material.dispose = () => {
      materialDisposeCount += 1
    }
  }

  disposeErrorFallbackMesh(new THREE.Mesh(geometry, materials))

  expect(geometryDisposeCount).toBe(1)
  expect(materialDisposeCount).toBe(2)
})
