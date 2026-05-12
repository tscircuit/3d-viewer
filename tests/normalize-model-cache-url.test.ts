import { expect, test } from "bun:test"
import { normalizeModelCacheUrl } from "../src/utils/normalize-model-cache-url"

test("removes cachebust_origin when it is the only query param", () => {
  expect(
    normalizeModelCacheUrl(
      "https://cdn.example.com/model.obj?cachebust_origin=abc123",
    ),
  ).toBe("https://cdn.example.com/model.obj")
})

test("removes cachebust_origin while preserving other query params", () => {
  expect(
    normalizeModelCacheUrl(
      "https://cdn.example.com/model.obj?uuid=1&cachebust_origin=abc123&pn=C123",
    ),
  ).toBe("https://cdn.example.com/model.obj?uuid=1&pn=C123")
})

test("removes trailing blank cachebust_origin param", () => {
  expect(
    normalizeModelCacheUrl(
      "https://cdn.example.com/model.obj?uuid=1&pn=C123&cachebust_origin=",
    ),
  ).toBe("https://cdn.example.com/model.obj?uuid=1&pn=C123")
})
