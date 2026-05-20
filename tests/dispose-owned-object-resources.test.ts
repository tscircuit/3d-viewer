import { expect, test } from "bun:test"
import * as THREE from "three"
import { disposeOwnedObjectResources } from "../src/utils/dispose-owned-object-resources"

test("disposes geometry and every material in an owned object tree", () => {
  const root = new THREE.Group()
  const geometry = new THREE.BoxGeometry()
  const materialA = new THREE.MeshStandardMaterial()
  const materialB = new THREE.MeshStandardMaterial()
  const mesh = new THREE.Mesh(geometry, [materialA, materialB])

  let geometryDisposed = false
  let materialADisposed = false
  let materialBDisposed = false

  geometry.dispose = () => {
    geometryDisposed = true
  }
  materialA.dispose = () => {
    materialADisposed = true
  }
  materialB.dispose = () => {
    materialBDisposed = true
  }

  root.add(mesh)

  disposeOwnedObjectResources(root)

  expect(geometryDisposed).toBe(true)
  expect(materialADisposed).toBe(true)
  expect(materialBDisposed).toBe(true)
})
