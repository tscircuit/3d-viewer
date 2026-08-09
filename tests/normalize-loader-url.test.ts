import { expect, test } from "bun:test"
import { normalizeLoaderUrl } from "../src/utils/normalize-loader-url"

test("removes cachebust_origin from the query string", () => {
  expect(
    normalizeLoaderUrl(
      "https://cdn.example.com/models/chip.obj?cachebust_origin=https%3A%2F%2Ftscircuit.com",
    ),
  ).toBe("https://cdn.example.com/models/chip.obj")
})

test("preserves other query params and hash fragments", () => {
  expect(
    normalizeLoaderUrl(
      "/models/chip.obj?foo=1&cachebust_origin=https%3A%2F%2Ftscircuit.com#part",
    ),
  ).toBe("/models/chip.obj?foo=1#part")
})
