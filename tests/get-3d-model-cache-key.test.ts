import { expect, test } from "bun:test"
import { get3DModelCacheKey } from "../src/utils/get-3d-model-cache-key"

test("returns the original URL when no cachebust_origin is present", () => {
  expect(get3DModelCacheKey("https://cdn.com/model.obj")).toBe(
    "https://cdn.com/model.obj",
  )
})

test("strips trailing cachebust_origin with empty value", () => {
  expect(
    get3DModelCacheKey("https://cdn.com/model.obj?uuid=abc&cachebust_origin="),
  ).toBe("https://cdn.com/model.obj?uuid=abc")
})

test("strips trailing cachebust_origin with a URL-encoded value", () => {
  expect(
    get3DModelCacheKey(
      "https://cdn.com/model.obj?uuid=abc&cachebust_origin=https%3A%2F%2Ftscircuit.com",
    ),
  ).toBe("https://cdn.com/model.obj?uuid=abc")
})

test("strips cachebust_origin when it is the only query parameter", () => {
  expect(
    get3DModelCacheKey("https://cdn.com/model.obj?cachebust_origin=foo"),
  ).toBe("https://cdn.com/model.obj")
})

test("strips cachebust_origin from the start of the query and preserves following params", () => {
  expect(
    get3DModelCacheKey(
      "https://cdn.com/model.obj?cachebust_origin=foo&uuid=abc",
    ),
  ).toBe("https://cdn.com/model.obj?uuid=abc")
})

test("strips cachebust_origin from the middle of the query", () => {
  expect(
    get3DModelCacheKey(
      "https://cdn.com/model.obj?uuid=abc&cachebust_origin=foo&pn=C123",
    ),
  ).toBe("https://cdn.com/model.obj?uuid=abc&pn=C123")
})

test("preserves URL fragment when stripping cachebust_origin", () => {
  expect(
    get3DModelCacheKey(
      "https://cdn.com/model.obj?uuid=abc&cachebust_origin=foo#section1",
    ),
  ).toBe("https://cdn.com/model.obj?uuid=abc#section1")
})

test("does not strip parameters with similar prefixes", () => {
  expect(
    get3DModelCacheKey(
      "https://cdn.com/model.obj?cachebust_origin_extra=foo&cachebust=bar",
    ),
  ).toBe("https://cdn.com/model.obj?cachebust_origin_extra=foo&cachebust=bar")
})

test("returns the same value for two URLs that differ only in cachebust_origin", () => {
  const a =
    "https://cdn.com/model.obj?uuid=abc&cachebust_origin=https%3A%2F%2Fa.com"
  const b =
    "https://cdn.com/model.obj?uuid=abc&cachebust_origin=https%3A%2F%2Fb.com"
  expect(get3DModelCacheKey(a)).toBe(get3DModelCacheKey(b))
})

test("returns the same value for trailing-empty vs filled cachebust_origin", () => {
  const a = "https://cdn.com/model.obj?uuid=abc&cachebust_origin="
  const b =
    "https://cdn.com/model.obj?uuid=abc&cachebust_origin=https%3A%2F%2Ftscircuit.com"
  expect(get3DModelCacheKey(a)).toBe(get3DModelCacheKey(b))
})

test("returns empty string when input is empty", () => {
  expect(get3DModelCacheKey("")).toBe("")
})

test("normalizes a real production URL from complex-board fixture", () => {
  const url =
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=229b69761e2c45dba6a83d8866dec72d&pn=C61423&cachebust_origin=https%3A%2F%2Ftscircuit.com"
  const expected =
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=229b69761e2c45dba6a83d8866dec72d&pn=C61423"
  expect(get3DModelCacheKey(url)).toBe(expected)
})

test("handles cachebust_origin appearing as a value-less parameter", () => {
  expect(
    get3DModelCacheKey("https://cdn.com/model.obj?uuid=abc&cachebust_origin"),
  ).toBe("https://cdn.com/model.obj?uuid=abc")
})
