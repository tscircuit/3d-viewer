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

test("rewrites Storybook EasyEDA proxy paths to remote CDN URLs by default", () => {
  expect(resolveModelUrl("/easyeda/C5184526")).toBe(
    "https://modelcdn.tscircuit.com/easyeda_models/download?pn=C5184526",
  )
  expect(
    resolveModelUrl("/easyeda-models/47443b588a77418ba6b4ea51975c36c0"),
  ).toBe("https://modules.easyeda.com/3dmodel/47443b588a77418ba6b4ea51975c36c0")
})
