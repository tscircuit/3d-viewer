import { afterEach, beforeEach, expect, mock, test } from "bun:test"
import { JSDOM } from "jsdom"
import { getRuntimeAssetUrl } from "../src/utils/get-runtime-asset-url"
import { loadManifold } from "../src/utils/manifold/load-manifold"

const previousWindow = globalThis.window
let dom: JSDOM

beforeEach(() => {
  dom = new JSDOM("", { url: "http://localhost:3020/demo/index.html" })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
})

afterEach(() => {
  globalThis.window = previousWindow
  dom.window.close()
})

test("keeps the default CDN URLs when no base URL is configured", () => {
  expect(getRuntimeAssetUrl("manifold-3d", "3.2.1", "manifold.js")).toBe(
    "https://cdn.jsdelivr.net/npm/manifold-3d@3.2.1/manifold.js",
  )
  expect(getRuntimeAssetUrl("occt-import-js", "0.0.23", "+esm")).toBe(
    "https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/+esm",
  )
  expect(
    getRuntimeAssetUrl("occt-import-js", "0.0.23", "dist/occt-import-js.wasm"),
  ).toBe(
    "https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.wasm",
  )
})

test.each([
  ["/jscdn", "http://localhost:3020/jscdn"],
  ["./jscdn/", "http://localhost:3020/demo/jscdn"],
  ["https://assets.example.com/jscdn/", "https://assets.example.com/jscdn"],
])("resolves JavaScript and WASM from %s", (baseUrl, expectedBase) => {
  window.TSCIRCUIT_JSCDN_BASE_URL = baseUrl
  expect(getRuntimeAssetUrl("manifold-3d", "3.2.1", "manifold.js")).toBe(
    `${expectedBase}/manifold-3d/3.2.1/manifold.js`,
  )
  expect(
    getRuntimeAssetUrl("occt-import-js", "0.0.23", "dist/occt-import-js.wasm"),
  ).toBe(`${expectedBase}/occt-import-js/0.0.23/dist/occt-import-js.wasm`)
})

test("shares Manifold initialization across viewers and retries a failed load", async () => {
  const module = { setup: mock(() => {}) }
  const factory = mock(async () => {
    if (factory.mock.calls.length === 1) throw new Error("WASM unavailable")
    return module
  })
  window.ManifoldModule = factory

  await expect(loadManifold()).rejects.toThrow("WASM unavailable")
  const [first, second] = await Promise.all([loadManifold(), loadManifold()])

  expect(first.setup).toBe(module.setup)
  expect(second).toBe(first)
  expect(window.ManifoldModule).toBe(module)
  expect(factory).toHaveBeenCalledTimes(2)
  expect(module.setup).toHaveBeenCalledTimes(1)
})
