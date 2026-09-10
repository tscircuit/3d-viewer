import { expect, test } from "bun:test"
import { getModelFileExtension } from "../src/utils/load-model"

test("gets model file extension from URLs with query strings", () => {
  expect(
    getModelFileExtension(
      "https://cdn.example.com/models/chip.glb?cachebust_origin=http%3A%2F%2Flocalhost%3A3020",
    ),
  ).toBe("glb")
  expect(getModelFileExtension("/models/enclosure.obj?version=2#mesh")).toBe(
    "obj",
  )
  expect(getModelFileExtension("/models/part.STL?cachebust_origin=")).toBe(
    "stl",
  )
  expect(getModelFileExtension("/models/legacy.wrl#view")).toBe("wrl")
})

test("returns an empty extension for unsupported or extensionless model URLs", () => {
  expect(getModelFileExtension("/models/download?uuid=abc123")).toBe("")
  expect(getModelFileExtension("/models/readme.txt?download=1")).toBe("txt")
})
