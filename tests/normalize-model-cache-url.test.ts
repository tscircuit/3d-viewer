import { test, expect } from "bun:test"
import { normalizeModelCacheUrl } from "../src/utils/normalize-model-cache-url"

test("removes cache bust params from model URLs", () => {
  expect(
    normalizeModelCacheUrl(
      "https://modelcdn.tscircuit.com/model.obj?uuid=abc&cachebust_origin=123",
    ),
  ).toBe("https://modelcdn.tscircuit.com/model.obj?uuid=abc")

  expect(
    normalizeModelCacheUrl(
      "https://modelcdn.tscircuit.com/model.obj?cachebust=456&uuid=abc",
    ),
  ).toBe("https://modelcdn.tscircuit.com/model.obj?uuid=abc")
})

test("keeps relative model URLs relative", () => {
  expect(normalizeModelCacheUrl("/models/part.obj?cachebust_origin=123")).toBe(
    "/models/part.obj",
  )
})
