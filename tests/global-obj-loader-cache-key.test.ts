import { expect, test } from "bun:test"
import { getGlobalObjLoaderCacheKey } from "../src/hooks/use-global-obj-loader"

test("normalizes cachebust_origin out of OBJ loader cache keys", () => {
  expect(
    getGlobalObjLoaderCacheKey(
      "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C1&cachebust_origin=http%3A%2F%2Flocalhost%3A3020",
    ),
  ).toBe(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C1",
  )
})

test("keeps relative model URLs relative when building cache keys", () => {
  expect(
    getGlobalObjLoaderCacheKey(
      "/easyeda-models/abc?cachebust_origin=http%3A%2F%2Flocalhost%3A3020&pn=C1",
    ),
  ).toBe("/easyeda-models/abc?pn=C1")
})

test("keeps host identity for protocol-relative model URLs", () => {
  expect(
    getGlobalObjLoaderCacheKey(
      "//cdn-a.example.com/model.obj?cachebust_origin=http%3A%2F%2Flocalhost%3A3020",
    ),
  ).toBe("https://cdn-a.example.com/model.obj")

  expect(
    getGlobalObjLoaderCacheKey(
      "//cdn-b.example.com/model.obj?cachebust_origin=http%3A%2F%2Flocalhost%3A3020",
    ),
  ).toBe("https://cdn-b.example.com/model.obj")
})
