import { beforeEach, describe, expect, test } from "bun:test"
import * as THREE from "three"
import {
  clearLoadedModelCacheForTests,
  getModelTypeFromUrl,
  load3DModelWithLoaders,
  normalizeModelCacheKey,
} from "../src/utils/load-model"

describe("load-model", () => {
  beforeEach(() => {
    clearLoadedModelCacheForTests()
  })

  test("normalizes cachebust_origin out of model cache keys", () => {
    expect(
      normalizeModelCacheKey(
        "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C1&cachebust_origin=https%3A%2F%2Ftscircuit.com",
      ),
    ).toBe(
      "https://modelcdn.tscircuit.com/easyeda_models/download?pn=C1&uuid=abc",
    )
  })

  test("uses an explicit model type for extensionless CDN URLs", () => {
    expect(
      getModelTypeFromUrl(
        "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C1",
        "obj",
      ),
    ).toBe("obj")
    expect(getModelTypeFromUrl("/models/chip.glb")).toBe("glb")
  })

  test("deduplicates in-flight loads and returns independent model clones", async () => {
    let loadCount = 0
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
    const sourceModel = new THREE.Group()
    sourceModel.add(new THREE.Mesh(geometry, material))

    const loaders = {
      stl: async () => new THREE.BufferGeometry(),
      obj: async () => {
        loadCount += 1
        await Promise.resolve()
        return sourceModel
      },
      wrl: async () => null,
      gltf: async () => new THREE.Group(),
    }

    const [firstModel, secondModel] = await Promise.all([
      load3DModelWithLoaders(
        "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C1&cachebust_origin=https%3A%2F%2Ftscircuit.com",
        "obj",
        loaders,
      ),
      load3DModelWithLoaders(
        "https://modelcdn.tscircuit.com/easyeda_models/download?pn=C1&uuid=abc&cachebust_origin=http%3A%2F%2Flocalhost%3A3020",
        "obj",
        loaders,
      ),
    ])

    expect(loadCount).toBe(1)
    expect(firstModel).toBeInstanceOf(THREE.Group)
    expect(secondModel).toBeInstanceOf(THREE.Group)
    expect(firstModel).not.toBe(secondModel)

    const firstMesh = firstModel!.children[0] as THREE.Mesh
    const secondMesh = secondModel!.children[0] as THREE.Mesh
    expect(firstMesh.geometry).toBe(secondMesh.geometry)
    expect(firstMesh.material).not.toBe(secondMesh.material)
  })
})
