import { expect, test } from "bun:test"
import * as THREE from "three"
import {
  getModelLoaderCacheKey,
  getModelLoaderType,
  loadModelForGlobalObjLoader,
} from "../src/hooks/use-global-obj-loader"

const triangleStl = `solid triangle
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 1 0
  endloop
endfacet
endsolid triangle`

test("normalizes only cachebust_origin in shared model cache keys", () => {
  expect(
    getModelLoaderCacheKey(
      "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&cachebust_origin=editor&pn=C123#mesh",
      "obj",
    ),
  ).toBe(
    "obj:https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C123#mesh",
  )
})

test("uses explicit STL type for extensionless model URLs", () => {
  const url =
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C123&cachebust_origin=editor"

  expect(getModelLoaderType(url, "stl")).toBe("stl")
  expect(getModelLoaderCacheKey(url, "stl")).toBe(
    "stl:https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C123",
  )
})

test("loads STL models through the shared model loader", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(triangleStl, {
      status: 200,
      statusText: "OK",
    })

  try {
    const model = await loadModelForGlobalObjLoader(
      "https://example.com/model.stl?cachebust_origin=editor",
      "stl",
    )

    expect(model).toBeInstanceOf(THREE.Mesh)
    const position = (model as THREE.Mesh).geometry.attributes.position
    expect(position).toBeDefined()
    expect(position!.count).toBe(3)
  } finally {
    globalThis.fetch = originalFetch
  }
})
