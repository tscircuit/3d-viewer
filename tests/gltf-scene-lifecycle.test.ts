import { expect, test } from "bun:test"
import * as THREE from "three"
import {
  applyGltfSceneMaterialState,
  disposeGltfSceneResources,
} from "../src/utils/gltf-scene-lifecycle"

test("applyGltfSceneMaterialState updates mesh materials without reloading scenes", () => {
  const scene = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ opacity: 1 })
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
  scene.add(mesh)

  applyGltfSceneMaterialState(scene, { isTranslucent: true })

  expect(material.transparent).toBe(true)
  expect(material.opacity).toBe(0.5)
  expect(material.depthWrite).toBe(false)
  expect(mesh.renderOrder).toBe(2)

  applyGltfSceneMaterialState(scene, { isTranslucent: false })

  expect(material.transparent).toBe(false)
  expect(material.opacity).toBe(1)
  expect(material.depthWrite).toBe(true)
  expect(mesh.renderOrder).toBe(1)
})

test("disposeGltfSceneResources disposes shared geometry, material, and textures once", () => {
  const scene = new THREE.Group()
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const texture = new THREE.Texture()
  const material = new THREE.MeshStandardMaterial({ map: texture })
  const firstMesh = new THREE.Mesh(geometry, material)
  const secondMesh = new THREE.Mesh(geometry, material)

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

  scene.add(firstMesh)
  scene.add(secondMesh)

  disposeGltfSceneResources(scene)

  expect(geometryDisposeCount).toBe(1)
  expect(materialDisposeCount).toBe(1)
  expect(textureDisposeCount).toBe(1)
})
