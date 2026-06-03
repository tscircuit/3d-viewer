import { expect, test } from "bun:test"
import { BufferGeometry, Float32BufferAttribute } from "three"
import { loadCachedStlDataGeometry } from "../src/utils/load-cached-stl-data-geometry"

test("caches parsed inline STL data while returning disposable clones", () => {
  const stlData = new ArrayBuffer(8)
  let parseCalls = 0
  const parsedGeometry = new BufferGeometry()
  parsedGeometry.setAttribute(
    "position",
    new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
  )

  const firstGeometry = loadCachedStlDataGeometry(stlData, () => {
    parseCalls += 1
    return parsedGeometry
  })
  const secondGeometry = loadCachedStlDataGeometry(stlData, () => {
    parseCalls += 1
    return new BufferGeometry()
  })

  expect(parseCalls).toBe(1)
  expect(firstGeometry).not.toBe(parsedGeometry)
  expect(secondGeometry).not.toBe(parsedGeometry)
  expect(firstGeometry).not.toBe(secondGeometry)

  firstGeometry.dispose()
  expect(secondGeometry.getAttribute("position")).toBeDefined()
})
