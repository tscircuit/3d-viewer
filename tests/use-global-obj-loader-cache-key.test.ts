import { expect, test } from "bun:test"
import { getObjLoaderCacheKey } from "../src/hooks/use-global-obj-loader"

test("removes cachebust_origin from the OBJ loader cache key", () => {
  expect(
    getObjLoaderCacheKey(
      "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=model-1&pn=C123&cachebust_origin=http%3A%2F%2Flocalhost%3A6006",
    ),
  ).toBe(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=model-1&pn=C123",
  )
})

test("keeps non-cachebust query parameters in the OBJ loader cache key", () => {
  expect(
    getObjLoaderCacheKey(
      "https://modelcdn.tscircuit.com/easyeda_models/download?cachebust_origin=https%3A%2F%2Fexample.com&uuid=model-1&pn=C123",
    ),
  ).toBe(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=model-1&pn=C123",
  )
})

test("keeps URLs unchanged when no cachebust_origin parameter is present", () => {
  expect(
    getObjLoaderCacheKey(
      "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=model-1&pn=C123",
    ),
  ).toBe(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=model-1&pn=C123",
  )
})
