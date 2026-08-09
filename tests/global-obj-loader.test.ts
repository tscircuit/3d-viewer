import { expect, test } from "bun:test"
import { getGlobalObjLoaderCacheKey } from "../src/utils/global-obj-loader-cache-key"

test("uses the same OBJ cache key when only cachebust_origin changes", () => {
  const modelUrl =
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc123&pn=C1"

  expect(
    getGlobalObjLoaderCacheKey(`${modelUrl}&cachebust_origin=https://a.test`),
  ).toBe(modelUrl)
  expect(
    getGlobalObjLoaderCacheKey(`${modelUrl}&cachebust_origin=https://b.test`),
  ).toBe(modelUrl)
})

test("keeps other query parameters in the OBJ cache key", () => {
  expect(
    getGlobalObjLoaderCacheKey(
      "/easyeda_models/download?uuid=abc123&pn=C1&cachebust_origin=https://a.test",
    ),
  ).toBe("/easyeda_models/download?uuid=abc123&pn=C1")

  expect(
    getGlobalObjLoaderCacheKey(
      "/easyeda_models/download?uuid=abc123&pn=C2&cachebust_origin=https://a.test",
    ),
  ).toBe("/easyeda_models/download?uuid=abc123&pn=C2")
})
