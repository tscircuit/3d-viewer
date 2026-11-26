import { expect, test } from "bun:test"
import { normalizeGltfModelCacheKey } from "../src/utils/gltf-model-cache"

test("normalizes cachebust_origin without dropping meaningful query params", () => {
  expect(
    normalizeGltfModelCacheKey(
      "https://assets.tscircuit.com/chip.glb?foo=1&cachebust_origin=abc&bar=2",
    ),
  ).toBe("https://assets.tscircuit.com/chip.glb?foo=1&bar=2")

  expect(
    normalizeGltfModelCacheKey("/models/chip.glb?cachebust_origin=abc"),
  ).toBe("/models/chip.glb")
})
