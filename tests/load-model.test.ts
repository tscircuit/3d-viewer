import { expect, test } from "bun:test"
import { getModelCacheKey, getModelFileExtension } from "../src/utils/load-model"

test("detects model file extensions before query strings and hashes", () => {
  expect(getModelFileExtension("https://cdn.example.com/part.glb?cachebust_origin=a#v1")).toBe(
    ".glb",
  )
  expect(getModelFileExtension("/models/bracket.STL?download=1")).toBe(".stl")
  expect(getModelFileExtension("/models/shape.obj#preview")).toBe(".obj")
  expect(getModelFileExtension("/models/shape.step?cachebust_origin=a")).toBeNull()
})

test("normalizes cachebust_origin without dropping meaningful query params", () => {
  expect(
    getModelCacheKey("https://cdn.example.com/part.glb?cachebust_origin=a&variant=left"),
  ).toBe("https://cdn.example.com/part.glb?variant=left")
  expect(getModelCacheKey("/models/part.obj?cachebust_origin=one")).toBe(
    "https://tscircuit.local/models/part.obj",
  )
  expect(getModelCacheKey("/models/part.obj?variant=right")).toBe(
    "https://tscircuit.local/models/part.obj?variant=right",
  )
})
