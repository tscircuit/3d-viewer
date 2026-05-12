import { expect, test } from "bun:test"
import { getStepModelCacheKey } from "../src/utils/step-model-cache-key"

test("normalizes empty cachebust_origin query params for STEP cache keys", () => {
  expect(
    getStepModelCacheKey(
      "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C1&cachebust_origin=",
    ),
  ).toBe(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C1",
  )
})

test("normalizes cachebust_origin wherever it appears in the query", () => {
  expect(
    getStepModelCacheKey(
      "/models/chip.step?cachebust_origin=preview-1&uuid=abc&pn=C1#part",
    ),
  ).toBe("/models/chip.step?uuid=abc&pn=C1#part")

  expect(
    getStepModelCacheKey(
      "/models/chip.step?uuid=abc&cachebust_origin=preview-2&pn=C1",
    ),
  ).toBe("/models/chip.step?uuid=abc&pn=C1")
})

test("preserves meaningful query params and hashes for distinct STEP URLs", () => {
  expect(getStepModelCacheKey("/models/chip.step?variant=A#pins")).toBe(
    "/models/chip.step?variant=A#pins",
  )
  expect(getStepModelCacheKey("/models/chip.step#pins")).toBe(
    "/models/chip.step#pins",
  )
})
