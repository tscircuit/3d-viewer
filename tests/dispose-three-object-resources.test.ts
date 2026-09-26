import { expect, test } from "bun:test"
import * as THREE from "three"
import { disposeThreeObjectResources } from "../src/utils/dispose-three-object-resources"

test("disposes geometry and material resources on nested meshes", () => {
  const group = new THREE.Group()
  const geometry = new THREE.BufferGeometry()
  const material = new THREE.MeshStandardMaterial()
  let geometryDisposed = 0
  let materialDisposed = 0

  geometry.dispose = () => {
    geometryDisposed += 1
  }
  material.dispose = () => {
    materialDisposed += 1
  }

  group.add(new THREE.Mesh(geometry, material))

  disposeThreeObjectResources(group)

  expect(geometryDisposed).toBe(1)
  expect(materialDisposed).toBe(1)
})

test("disposes every material in a material array", () => {
  const geometry = new THREE.BufferGeometry()
  const firstMaterial = new THREE.MeshStandardMaterial()
  const secondMaterial = new THREE.MeshStandardMaterial()
  const mesh = new THREE.Mesh(geometry, [firstMaterial, secondMaterial])
  const disposedMaterials: string[] = []

  geometry.dispose = () => {}
  firstMaterial.dispose = () => {
    disposedMaterials.push("first")
  }
  secondMaterial.dispose = () => {
    disposedMaterials.push("second")
  }

  disposeThreeObjectResources(mesh)

  expect(disposedMaterials).toEqual(["first", "second"])
})
