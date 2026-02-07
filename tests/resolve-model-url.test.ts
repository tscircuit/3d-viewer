import { expect, test } from "bun:test"
import { resolveModelUrl } from "../src/utils/resolve-model-url"

test("returns the original model URL when no resolver is provided", () => {
  expect(resolveModelUrl("/models/chip.glb")).toBe("/models/chip.glb")
})

test("uses resolveStaticAsset to resolve model URLs", () => {
  const resolved = resolveModelUrl("/models/chip.glb", (modelUrl) => {
    return `https://cdn.example.com${modelUrl}`
  })

  expect(resolved).toBe("https://cdn.example.com/models/chip.glb")
})

test("returns undefined for empty model URL input", () => {
  expect(resolveModelUrl(undefined, (modelUrl) => modelUrl)).toBeUndefined()
})
