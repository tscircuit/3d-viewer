import { expect, test } from "bun:test"
import { getModelCacheKey, getModelFormat } from "../src/utils/load-model"

test("normalizes cache-busting params without dropping meaningful query data", () => {
  const cacheKey = getModelCacheKey(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&cachebust_origin=123&pn=C1#part",
  )

  expect(cacheKey).toBe(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C1#part",
  )
})

test("detects model format from path before query and hash suffixes", () => {
  expect(getModelFormat("/models/chip.glb?cachebust_origin=1#mesh")).toBe("glb")
  expect(getModelFormat("https://example.com/model.wrl?version=2")).toBe("wrl")
})

test("uses explicit model format for extensionless CDN download URLs", () => {
  expect(
    getModelFormat(
      "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C1",
      "obj",
    ),
  ).toBe("obj")
})
