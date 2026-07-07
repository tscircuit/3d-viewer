import { beforeEach, expect, test } from "bun:test"
import * as THREE from "three"
import {
  clear3DModelCache,
  getModelFileFormat,
  load3DModel,
  type ModelFileFormat,
  normalizeModelCacheKey,
} from "../src/utils/load-model"

function createTemplateModel() {
  const group = new THREE.Group()
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
  group.add(new THREE.Mesh(geometry, material))
  return group
}

function getFirstMaterial(object: THREE.Object3D) {
  return (object.children[0] as THREE.Mesh)
    .material as THREE.MeshStandardMaterial
}

beforeEach(() => {
  clear3DModelCache()
})

test("detects model file formats from URL paths with query strings", () => {
  expect(getModelFileFormat("https://cdn.example.com/model.glb?cache=1")).toBe(
    "glb",
  )
  expect(getModelFileFormat("/models/part.obj#mesh")).toBe("obj")
  expect(
    getModelFileFormat(
      "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=123",
    ),
  ).toBeNull()
})

test("normalizes cache keys by removing cachebust_origin only", () => {
  expect(
    normalizeModelCacheKey(
      "https://cdn.example.com/part.obj?cachebust_origin=first&pn=C1#body",
    ),
  ).toBe("https://cdn.example.com/part.obj?pn=C1#body")

  expect(
    normalizeModelCacheKey("/models/part.obj?pn=C1&cachebust_origin=second"),
  ).toBe("/models/part.obj?pn=C1")
})

test("deduplicates equivalent in-flight loads and returns isolated material clones", async () => {
  const template = createTemplateModel()
  let loadCount = 0
  const loadModel = async (_url: string, _format: ModelFileFormat) => {
    loadCount += 1
    await Promise.resolve()
    return template
  }

  const [first, second] = await Promise.all([
    load3DModel(
      "https://cdn.example.com/part.obj?cachebust_origin=first&pn=C1",
      { modelFormat: "obj", loadModel },
    ),
    load3DModel(
      "https://cdn.example.com/part.obj?pn=C1&cachebust_origin=second",
      { modelFormat: "obj", loadModel },
    ),
  ])

  expect(loadCount).toBe(1)
  expect(first).toBeInstanceOf(THREE.Object3D)
  expect(second).toBeInstanceOf(THREE.Object3D)
  expect(first).not.toBe(second)

  const firstMaterial = getFirstMaterial(first!)
  const secondMaterial = getFirstMaterial(second!)
  const templateMaterial = getFirstMaterial(template)

  expect(firstMaterial).not.toBe(secondMaterial)
  expect(firstMaterial).not.toBe(templateMaterial)

  firstMaterial.opacity = 0.25
  expect(secondMaterial.opacity).toBe(1)
})

test("clears failed loads from cache so a later attempt can retry", async () => {
  const template = createTemplateModel()
  let loadCount = 0
  const loadModel = async (_url: string, _format: ModelFileFormat) => {
    loadCount += 1
    if (loadCount === 1) {
      throw new Error("temporary load failure")
    }
    return template
  }

  await expect(
    load3DModel("https://cdn.example.com/part.obj", {
      modelFormat: "obj",
      loadModel,
    }),
  ).rejects.toThrow("temporary load failure")

  const model = await load3DModel("https://cdn.example.com/part.obj", {
    modelFormat: "obj",
    loadModel,
  })

  expect(model).toBeInstanceOf(THREE.Object3D)
  expect(loadCount).toBe(2)
})

test("supports explicit formats for opaque model download URLs", async () => {
  let loadedFormat: ModelFileFormat | null = null
  const loadModel = async (_url: string, format: ModelFileFormat) => {
    loadedFormat = format
    return createTemplateModel()
  }

  const model = await load3DModel(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=123&cachebust_origin=",
    { modelFormat: "obj", loadModel },
  )

  expect(model).toBeInstanceOf(THREE.Object3D)
  expect(loadedFormat).toBe("obj")
})
