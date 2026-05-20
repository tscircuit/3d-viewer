import { expect, test } from "bun:test"
import * as THREE from "three"
import { disposeObject3DResources } from "../src/utils/dispose-object3d-resources"

test("disposes shared geometries, materials, and textures once", () => {
  const object = new THREE.Group()
  const geometry = new THREE.BufferGeometry()
  const texture = new THREE.Texture()
  const environmentMap = new THREE.Texture()
  const material = new THREE.MeshStandardMaterial({ map: texture })
  material.envMap = environmentMap

  let geometryDisposals = 0
  let materialDisposals = 0
  let textureDisposals = 0
  let environmentMapDisposals = 0

  geometry.dispose = () => {
    geometryDisposals += 1
  }
  material.dispose = () => {
    materialDisposals += 1
  }
  texture.dispose = () => {
    textureDisposals += 1
  }
  environmentMap.dispose = () => {
    environmentMapDisposals += 1
  }

  object.add(new THREE.Mesh(geometry, material))
  object.add(new THREE.Mesh(geometry, material))

  disposeObject3DResources(object)

  expect(geometryDisposals).toBe(1)
  expect(materialDisposals).toBe(1)
  expect(textureDisposals).toBe(1)
  expect(environmentMapDisposals).toBe(0)
})
