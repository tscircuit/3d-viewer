import { beforeEach, expect, test } from "bun:test"
import { Object3D } from "three"
import { getModelLoadCache, loadCached3DModel } from "../src/utils/load-model"

beforeEach(() => {
  getModelLoadCache().clear()
})

test("deduplicates model loads and returns independent clones", async () => {
  const sourceModel = new Object3D()
  sourceModel.name = "cached-source"
  let loadCount = 0

  const firstLoad = loadCached3DModel("/models/chip.glb", async () => {
    loadCount += 1
    return sourceModel
  })
  const secondLoad = loadCached3DModel("/models/chip.glb", async () => {
    loadCount += 1
    return new Object3D()
  })

  const [firstModel, secondModel] = await Promise.all([firstLoad, secondLoad])

  expect(loadCount).toBe(1)
  expect(firstModel).not.toBe(sourceModel)
  expect(secondModel).not.toBe(sourceModel)
  expect(firstModel).not.toBe(secondModel)

  if (!firstModel || !secondModel) {
    throw new Error("Expected cached model loads to return clones")
  }

  firstModel.position.set(1, 2, 3)

  const thirdModel = await loadCached3DModel("/models/chip.glb", async () => {
    loadCount += 1
    return new Object3D()
  })

  expect(loadCount).toBe(1)
  expect(secondModel.position.x).toBe(0)
  expect(thirdModel?.position.x).toBe(0)
})

test("drops failed model loads so the URL can be retried", async () => {
  let loadCount = 0

  await expect(
    loadCached3DModel("/models/broken.glb", async () => {
      loadCount += 1
      throw new Error("network failed")
    }),
  ).rejects.toThrow("network failed")

  expect(getModelLoadCache().has("/models/broken.glb")).toBe(false)

  const model = await loadCached3DModel("/models/broken.glb", async () => {
    loadCount += 1
    return new Object3D()
  })

  expect(loadCount).toBe(2)
  expect(model).toBeInstanceOf(Object3D)
})
