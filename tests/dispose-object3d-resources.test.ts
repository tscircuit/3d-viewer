import { expect, test } from "bun:test"
import * as THREE from "three"
import { disposeObject3DResources } from "../src/utils/dispose-object3d-resources"

test("disposeObject3DResources disposes owned geometry, material, and textures once", () => {
  const group = new THREE.Group()
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const texture = new THREE.Texture()
  const material = new THREE.MeshStandardMaterial({ map: texture })
  const firstMesh = new THREE.Mesh(geometry, material)
  const secondMesh = new THREE.Mesh(geometry, material)
  let geometryDisposals = 0
  let materialDisposals = 0
  let textureDisposals = 0

  geometry.addEventListener("dispose", () => {
    geometryDisposals += 1
  })
  material.addEventListener("dispose", () => {
    materialDisposals += 1
  })
  texture.addEventListener("dispose", () => {
    textureDisposals += 1
  })

  group.add(firstMesh, secondMesh)

  disposeObject3DResources(group)

  expect(geometryDisposals).toBe(1)
  expect(materialDisposals).toBe(1)
  expect(textureDisposals).toBe(1)
})

test("disposeObject3DResources leaves externally assigned env maps alone", () => {
  const group = new THREE.Group()
  const externalEnvMap = new THREE.Texture()
  const material = new THREE.MeshStandardMaterial({ envMap: externalEnvMap })
  let envMapDisposals = 0

  externalEnvMap.addEventListener("dispose", () => {
    envMapDisposals += 1
  })

  group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material))

  disposeObject3DResources(group)

  expect(envMapDisposals).toBe(0)
})
