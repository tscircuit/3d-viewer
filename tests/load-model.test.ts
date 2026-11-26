import { afterEach, expect, test } from "bun:test"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { clear3DModelCache, load3DModel } from "../src/utils/load-model"

const originalObjLoadAsync = OBJLoader.prototype.loadAsync
const originalStlLoadAsync = STLLoader.prototype.loadAsync
const originalGltfLoadAsync = GLTFLoader.prototype.loadAsync

function createLoadedGroup() {
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xff0000 }),
    ),
  )
  return group
}

function getFirstMesh(object: THREE.Object3D | null): THREE.Mesh | null {
  let mesh: THREE.Mesh | null = null
  object?.traverse((child) => {
    if (!mesh && child instanceof THREE.Mesh) {
      mesh = child
    }
  })
  return mesh
}

afterEach(() => {
  OBJLoader.prototype.loadAsync = originalObjLoadAsync
  STLLoader.prototype.loadAsync = originalStlLoadAsync
  GLTFLoader.prototype.loadAsync = originalGltfLoadAsync
  clear3DModelCache()
})

test("loads explicit OBJ model URLs that do not have a .obj pathname", async () => {
  const loadedUrls: string[] = []
  OBJLoader.prototype.loadAsync = async (url: string) => {
    loadedUrls.push(url)
    return createLoadedGroup()
  }

  const url =
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C1&cachebust_origin=https%3A%2F%2Ftscircuit.com"

  const model = await load3DModel(url, "obj")

  expect(model).toBeInstanceOf(THREE.Object3D)
  expect(loadedUrls).toEqual([url])
})

test("detects model format from pathname before query and hash suffixes", async () => {
  const loadedUrls: string[] = []
  STLLoader.prototype.loadAsync = async (url: string) => {
    loadedUrls.push(url)
    return new THREE.BufferGeometry()
  }

  const url =
    "https://cdn.example.com/models/chip.stl?cachebust_origin=local#body"
  const model = await load3DModel(url)

  expect(model).toBeInstanceOf(THREE.Mesh)
  expect(loadedUrls).toEqual([url])
})

test("deduplicates equivalent cachebusted model loads and returns isolated clones", async () => {
  let loadCount = 0
  OBJLoader.prototype.loadAsync = async () => {
    loadCount += 1
    await Promise.resolve()
    return createLoadedGroup()
  }

  const firstUrl =
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C1&cachebust_origin=http%3A%2F%2Flocalhost%3A6006"
  const secondUrl =
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C1&cachebust_origin=https%3A%2F%2Ftscircuit.com"

  const [firstModel, secondModel] = await Promise.all([
    load3DModel(firstUrl, "obj"),
    load3DModel(secondUrl, "obj"),
  ])

  expect(loadCount).toBe(1)
  expect(firstModel).toBeInstanceOf(THREE.Object3D)
  expect(secondModel).toBeInstanceOf(THREE.Object3D)
  expect(firstModel).not.toBe(secondModel)

  const firstMesh = getFirstMesh(firstModel)
  const secondMesh = getFirstMesh(secondModel)

  expect(firstMesh).toBeInstanceOf(THREE.Mesh)
  expect(secondMesh).toBeInstanceOf(THREE.Mesh)
  if (!firstMesh || !secondMesh) {
    throw new Error("expected each loaded model clone to contain a mesh")
  }
  expect(firstMesh.geometry).not.toBe(secondMesh.geometry)
  expect(firstMesh.material).not.toBe(secondMesh.material)
})
