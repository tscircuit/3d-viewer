import { expect, test } from "bun:test"
import { getGlobalObjLoaderCacheKey } from "../src/hooks/use-global-obj-loader"

test("normalizes cachebust_origin out of global obj loader cache keys", () => {
  expect(
    getGlobalObjLoaderCacheKey(
      "https://modelcdn.tscircuit.com/part.obj?uuid=abc&cachebust_origin=viewer",
    ),
  ).toBe("https://modelcdn.tscircuit.com/part.obj?uuid=abc")
})

test("sorts meaningful query params in global obj loader cache keys", () => {
  expect(
    getGlobalObjLoaderCacheKey(
      "https://modelcdn.tscircuit.com/part.wrl?z=last&a=first",
    ),
  ).toBe("https://modelcdn.tscircuit.com/part.wrl?a=first&z=last")
})

test("normalizes relative global obj loader URLs without inventing origin", () => {
  expect(
    getGlobalObjLoaderCacheKey("/models/chip.obj?cachebust_origin=editor"),
  ).toBe("/models/chip.obj")
})
