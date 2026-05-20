import { expect, test } from "bun:test"
import { Object3D } from "three"
import {
  type CacheItem,
  loadGlobalObjFromCache,
} from "../src/hooks/use-global-obj-loader"

test("clears failed OBJ cache entries so later calls can retry", async () => {
  const cleanUrl = "/models/part.obj"
  const cache = new Map<string, CacheItem>()
  const transientError = new Error("temporary fetch failure")
  const loadedModel = new Object3D()
  let loadCount = 0

  const loadModel = async () => {
    loadCount += 1
    return loadCount === 1 ? transientError : loadedModel
  }

  const firstResult = await loadGlobalObjFromCache({
    cleanUrl,
    cache,
    loadModel,
  })

  expect(firstResult).toBe(transientError)
  expect(cache.has(cleanUrl)).toBe(false)

  const secondResult = await loadGlobalObjFromCache({
    cleanUrl,
    cache,
    loadModel,
  })

  expect(secondResult).toBe(loadedModel)
  expect(loadCount).toBe(2)
  expect(cache.get(cleanUrl)?.result).toBe(loadedModel)

  const cachedResult = await loadGlobalObjFromCache({
    cleanUrl,
    cache,
    loadModel,
  })

  expect(cachedResult).toBeInstanceOf(Object3D)
  expect(cachedResult).not.toBe(loadedModel)
  expect(loadCount).toBe(2)
})

test("clears rejected OBJ cache entries so later calls can retry", async () => {
  const cleanUrl = "/models/rejecting.obj"
  const cache = new Map<string, CacheItem>()
  const transientError = new Error("network dropped")

  const result = await loadGlobalObjFromCache({
    cleanUrl,
    cache,
    loadModel: async () => {
      throw transientError
    },
  })

  expect(result).toBe(transientError)
  expect(cache.has(cleanUrl)).toBe(false)
})

test("clears synchronously thrown OBJ cache errors", async () => {
  const cleanUrl = "/models/throwing.obj"
  const cache = new Map<string, CacheItem>()
  const transientError = new Error("loader setup failed")

  const result = await loadGlobalObjFromCache({
    cleanUrl,
    cache,
    loadModel: () => {
      throw transientError
    },
  })

  expect(result).toBe(transientError)
  expect(cache.has(cleanUrl)).toBe(false)
})

test("does not delete a newer cache entry when an older load fails late", async () => {
  const cleanUrl = "/models/racing.obj"
  const cache = new Map<string, CacheItem>()
  const replacementModel = new Object3D()
  let resolveFirstLoad: (result: Object3D | Error) => void = () => {}

  const firstResultPromise = loadGlobalObjFromCache({
    cleanUrl,
    cache,
    loadModel: () =>
      new Promise<Object3D | Error>((resolve) => {
        resolveFirstLoad = resolve
      }),
  })

  await Promise.resolve()

  const replacementPromise = Promise.resolve(replacementModel)
  cache.set(cleanUrl, { promise: replacementPromise, result: replacementModel })

  resolveFirstLoad(new Error("stale failure"))
  await firstResultPromise

  expect(cache.get(cleanUrl)?.result).toBe(replacementModel)
})
