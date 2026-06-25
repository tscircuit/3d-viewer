import { afterEach, expect, mock, test } from "bun:test"
import { Group } from "three"
import {
  clearGlobalGltfLoaderCache,
  loadCachedGltfScene,
} from "../src/hooks/use-global-gltf-loader"

const loadAsyncMock = mock(async () => ({ scene: new Group() }))

mock.module("three-stdlib", () => ({
  GLTFLoader: class {
    loadAsync = loadAsyncMock
  },
}))

afterEach(() => {
  clearGlobalGltfLoaderCache()
  loadAsyncMock.mockClear()
})

test("loads the same glTF URL once and returns cloned scenes", async () => {
  const [firstScene, secondScene] = await Promise.all([
    loadCachedGltfScene("/models/chip.glb"),
    loadCachedGltfScene("/models/chip.glb"),
  ])

  expect(loadAsyncMock).toHaveBeenCalledTimes(1)
  expect(loadAsyncMock).toHaveBeenCalledWith("/models/chip.glb")
  expect(firstScene).toBeInstanceOf(Group)
  expect(secondScene).toBeInstanceOf(Group)
  expect(firstScene).not.toBe(secondScene)
})
