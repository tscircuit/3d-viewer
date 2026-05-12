import { expect, test } from "bun:test"
import { getModelCacheKey } from "../src/utils/model-url-cache-key"

test("removes cachebust_origin from absolute model URLs", () => {
  expect(
    getModelCacheKey(
      "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C123&cachebust_origin=http%3A%2F%2Flocalhost%3A6006",
    ),
  ).toBe(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C123",
  )
})

test("removes cachebust_origin while preserving other query parameters", () => {
  expect(
    getModelCacheKey(
      "https://example.com/model.glb?cachebust_origin=http%3A%2F%2Flocalhost%3A6006&variant=preview",
    ),
  ).toBe("https://example.com/model.glb?variant=preview")
})

test("normalizes relative model URLs without forcing a fake origin", () => {
  expect(
    getModelCacheKey(
      "/assets/model.glb?cachebust_origin=http%3A%2F%2Flocalhost%3A6006&v=1#part",
    ),
  ).toBe("/assets/model.glb?v=1#part")
})
