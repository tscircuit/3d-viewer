import { beforeEach, expect, test } from "bun:test"
import * as THREE from "three"
import {
  clearStlGeometryCache,
  loadCachedStlGeometry,
  normalizeStlUrlCacheKey,
} from "../src/utils/load-cached-stl-geometry"

beforeEach(() => {
  clearStlGeometryCache()
})

test("normalizes cachebust_origin out of STL cache keys", () => {
  expect(
    normalizeStlUrlCacheKey(
      "https://models.example.com/part.stl?uuid=abc&cachebust_origin=preview#mesh",
    ),
  ).toBe("https://models.example.com/part.stl?uuid=abc#mesh")
  expect(
    normalizeStlUrlCacheKey("/models/part.stl?cachebust_origin=one&uuid=abc"),
  ).toBe("/models/part.stl?uuid=abc")
})

test("deduplicates concurrent STL loads for equivalent cache-busted URLs", async () => {
  const loadedUrls: string[] = []
  const templateGeometry = new THREE.BufferGeometry()
  templateGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0]), 3),
  )

  const createLoader = () => ({
    load: (url: string, onLoad: (geometry: THREE.BufferGeometry) => void) => {
      loadedUrls.push(url)
      queueMicrotask(() => onLoad(templateGeometry))
    },
  })

  const [first, second] = await Promise.all([
    loadCachedStlGeometry(
      "/models/part.stl?cachebust_origin=first&uuid=abc",
      createLoader,
    ),
    loadCachedStlGeometry(
      "/models/part.stl?uuid=abc&cachebust_origin=second",
      createLoader,
    ),
  ])

  expect(loadedUrls).toEqual([
    "/models/part.stl?cachebust_origin=first&uuid=abc",
  ])
  expect(first).not.toBe(templateGeometry)
  expect(second).not.toBe(templateGeometry)
  expect(first).not.toBe(second)
})

test("does not cache failed STL loads", async () => {
  let attempts = 0
  const createLoader = () => ({
    load: (
      _url: string,
      _onLoad: (geometry: THREE.BufferGeometry) => void,
      _onProgress: unknown,
      onError?: (error: Error) => void,
    ) => {
      attempts += 1
      queueMicrotask(() => onError?.(new Error("failed")))
    },
  })

  await expect(
    loadCachedStlGeometry("/models/broken.stl", createLoader),
  ).rejects.toThrow("failed")
  await expect(
    loadCachedStlGeometry("/models/broken.stl", createLoader),
  ).rejects.toThrow("failed")

  expect(attempts).toBe(2)
})
