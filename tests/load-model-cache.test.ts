import { expect, test } from "bun:test"
import * as THREE from "three"
import {
  cloneLoadedModel,
  getModelFileExtension,
  load3DModel,
  normalizeModelUrlForCache,
} from "../src/utils/load-model"

test("normalizes cachebust_origin out of model cache keys", () => {
  expect(
    normalizeModelUrlForCache(
      "https://cdn.example.com/model.obj?cachebust_origin=&pn=C1#mesh",
    ),
  ).toBe("https://cdn.example.com/model.obj?pn=C1#mesh")

  expect(
    normalizeModelUrlForCache(
      "https://cdn.example.com/model.obj?pn=C1&cachebust_origin=&uuid=abc",
    ),
  ).toBe("https://cdn.example.com/model.obj?pn=C1&uuid=abc")

  expect(
    normalizeModelUrlForCache(
      "https://cdn.example.com/model.obj?cachebust_origin=",
    ),
  ).toBe("https://cdn.example.com/model.obj")
})

test("detects model extensions before query strings and hashes", () => {
  expect(getModelFileExtension("https://cdn.example.com/model.glb?v=1")).toBe(
    "glb",
  )
  expect(getModelFileExtension("/models/part.OBJ#mesh")).toBe("obj")
  expect(getModelFileExtension("/models/part.stl?cachebust_origin=#mesh")).toBe(
    "stl",
  )
  expect(getModelFileExtension("/models/part")).toBeNull()
})

test("clones loaded model materials for independent instances", () => {
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
  const model = new THREE.Group()
  model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material))

  const firstClone = cloneLoadedModel(model) as THREE.Group
  const secondClone = cloneLoadedModel(model) as THREE.Group
  const firstMesh = firstClone.children[0] as THREE.Mesh
  const secondMesh = secondClone.children[0] as THREE.Mesh

  expect(firstClone).not.toBe(secondClone)
  expect(firstMesh.material).not.toBe(secondMesh.material)
  expect(firstMesh.material).not.toBe(material)
})

test("load3DModel deduplicates concurrent cache-busted loads", async () => {
  const cache = new Map()
  let loadCount = 0
  const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
  const loadedModel = new THREE.Group()
  loadedModel.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material))

  const [firstModel, secondModel] = await Promise.all([
    load3DModel("https://cdn.example.com/model.obj?cachebust_origin=1", {
      cache,
      loadModel: async (_url, extension) => {
        loadCount += 1
        expect(extension).toBe("obj")
        return loadedModel
      },
    }),
    load3DModel("https://cdn.example.com/model.obj?cachebust_origin=2", {
      cache,
      loadModel: async (_url, extension) => {
        loadCount += 1
        expect(extension).toBe("obj")
        return loadedModel
      },
    }),
  ])

  expect(loadCount).toBe(1)
  expect(firstModel).not.toBe(secondModel)

  const firstMesh = firstModel?.children[0] as THREE.Mesh
  const secondMesh = secondModel?.children[0] as THREE.Mesh
  expect(firstMesh.material).not.toBe(secondMesh.material)
})
