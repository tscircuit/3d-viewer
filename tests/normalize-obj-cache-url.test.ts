import { expect, test } from "bun:test"
import { normalizeObjCacheUrl } from "../src/utils/normalize-obj-cache-url"

test("strips cachebust_origin for identical CDN identity", () => {
  const a =
    "https://modelcdn.example/easyeda_models/download?uuid=abc&pn=C1&cachebust_origin=https%3A%2F%2Fa.com"
  const b =
    "https://modelcdn.example/easyeda_models/download?uuid=abc&pn=C1&cachebust_origin=https%3A%2F%2Fb.com"
  expect(normalizeObjCacheUrl(a)).toBe(normalizeObjCacheUrl(b))
})

test("legacy empty cachebust suffix at end of query", () => {
  const u =
    "https://modelcdn.example/easyeda_models/download?uuid=abc&cachebust_origin="
  expect(normalizeObjCacheUrl(u)).toBe(
    "https://modelcdn.example/easyeda_models/download?uuid=abc",
  )
})
