import { expect, test } from "bun:test"
import { getModelCacheKey } from "../src/utils/load-model"

test("removes cachebust_origin from absolute model URLs", () => {
  expect(
    getModelCacheKey(
      "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C123&cachebust_origin=",
    ),
  ).toBe(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C123",
  )
})

test("removes cachebust_origin without dropping meaningful query params", () => {
  expect(
    getModelCacheKey("/models/chip.glb?foo=1&cachebust_origin=123&bar=2"),
  ).toBe("/models/chip.glb?foo=1&bar=2")
})

test("preserves relative model URL shape", () => {
  expect(getModelCacheKey("models/chip.obj?cachebust_origin=123")).toBe(
    "models/chip.obj",
  )
})
