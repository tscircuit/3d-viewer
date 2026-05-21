import { expect, test } from "bun:test"
import * as THREE from "three"
import { disposeObject3D } from "../src/utils/dispose-object3d"

test("disposeObject3D disposes owned geometry, material, and textures", () => {
  const root = new THREE.Group()
  const geometry = new THREE.BufferGeometry()
  const texture = new THREE.Texture()
  const material = new THREE.MeshStandardMaterial({ map: texture })
  let geometryDisposeCount = 0
  let materialDisposeCount = 0
  let textureDisposeCount = 0

  geometry.dispose = () => {
    geometryDisposeCount += 1
  }
  material.dispose = () => {
    materialDisposeCount += 1
  }
  texture.dispose = () => {
    textureDisposeCount += 1
  }

  root.add(new THREE.Mesh(geometry, material))

  disposeObject3D(root)

  expect(geometryDisposeCount).toBe(1)
  expect(materialDisposeCount).toBe(1)
  expect(textureDisposeCount).toBe(1)
  expect(root.children).toHaveLength(0)
  expect(material.map).toBeNull()
})

test("disposeObject3D disposes shared resources only once", () => {
  const root = new THREE.Group()
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

  root.add(new THREE.Mesh(geometry, material))
  root.add(new THREE.Mesh(geometry, material))

  disposeObject3D(root)

  expect(geometryDisposeCount).toBe(1)
  expect(materialDisposeCount).toBe(1)
})

test("disposeObject3D disposes material arrays", () => {
  const root = new THREE.Group()
  const geometry = new THREE.BufferGeometry()
  const materials = [
    new THREE.MeshStandardMaterial(),
    new THREE.MeshStandardMaterial(),
  ]
  let materialDisposeCount = 0

  for (const material of materials) {
    material.dispose = () => {
      materialDisposeCount += 1
    }
  }

  root.add(new THREE.Mesh(geometry, materials))

  disposeObject3D(root)

  expect(materialDisposeCount).toBe(2)
})
