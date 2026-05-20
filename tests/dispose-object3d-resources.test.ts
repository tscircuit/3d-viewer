import { expect, test } from "bun:test"
import * as THREE from "three"
import { disposeObject3DResources } from "../src/utils/dispose-object3d-resources"

test("disposes mesh geometry, materials, and material textures", () => {
  const root = new THREE.Group()
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const texture = new THREE.Texture()
  const material = new THREE.MeshStandardMaterial({ map: texture })
  const mesh = new THREE.Mesh(geometry, material)

  root.add(mesh)

  let geometryDisposed = false
  let materialDisposed = false
  let textureDisposed = false
  geometry.addEventListener("dispose", () => {
    geometryDisposed = true
  })
  material.addEventListener("dispose", () => {
    materialDisposed = true
  })
  texture.addEventListener("dispose", () => {
    textureDisposed = true
  })

  disposeObject3DResources(root)

  expect(geometryDisposed).toBe(true)
  expect(materialDisposed).toBe(true)
  expect(textureDisposed).toBe(true)
})

test("disposes every material in a multi-material mesh", () => {
  const root = new THREE.Group()
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const firstMaterial = new THREE.MeshStandardMaterial()
  const secondMaterial = new THREE.MeshStandardMaterial()
  const mesh = new THREE.Mesh(geometry, [firstMaterial, secondMaterial])

  root.add(mesh)

  const disposed: boolean[] = []
  firstMaterial.addEventListener("dispose", () => {
    disposed[0] = true
  })
  secondMaterial.addEventListener("dispose", () => {
    disposed[1] = true
  })

  disposeObject3DResources(root)

  expect(disposed).toEqual([true, true])
})
