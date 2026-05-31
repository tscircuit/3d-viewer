import { expect, test } from "bun:test"
import { getLoad3DModelCacheKey } from "../src/utils/load-model"

test("normalizes cachebust_origin out of model cache keys", () => {
  expect(
    getLoad3DModelCacheKey(
      "https://modelcdn.tscircuit.com/part.obj?uuid=abc&cachebust_origin=viewer",
    ),
  ).toBe("https://modelcdn.tscircuit.com/part.obj?uuid=abc")
})

test("keeps meaningful query params sorted in model cache keys", () => {
  expect(
    getLoad3DModelCacheKey(
      "https://modelcdn.tscircuit.com/part.glb?z=last&a=first",
    ),
  ).toBe("https://modelcdn.tscircuit.com/part.glb?a=first&z=last")
})

test("normalizes relative model URLs without inventing an origin", () => {
  expect(getLoad3DModelCacheKey("/models/chip.stl?cachebust_origin=editor")).toBe(
    "/models/chip.stl",
  )
})
