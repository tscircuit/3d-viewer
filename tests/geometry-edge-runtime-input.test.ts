import { expect, test } from "bun:test"
import { compareGeometryEdges } from "./fixtures/geometry-edge-comparison"

const valid = { width: 3, height: 3, data: new Uint8Array(36) }

test.each([
  {
    label: "null image",
    run: () => {
      // @ts-expect-error Exercise malformed inputs from untyped callers.
      compareGeometryEdges(null, valid)
    },
    message: "dimensions",
  },
  {
    label: "plain array instead of RGBA bytes",
    run: () => {
      // @ts-expect-error Exercise malformed inputs from untyped callers.
      compareGeometryEdges(valid, { ...valid, data: Array(36).fill(0) })
    },
    message: "RGBA byte array",
  },
  {
    label: "floating point data",
    run: () => {
      // @ts-expect-error Exercise malformed inputs from untyped callers.
      compareGeometryEdges(valid, { ...valid, data: new Float32Array(36) })
    },
    message: "RGBA byte array",
  },
  {
    label: "null options",
    run: () => {
      // @ts-expect-error Exercise malformed inputs from untyped callers.
      compareGeometryEdges(valid, valid, null)
    },
    message: "options must be an object",
  },
  {
    label: "array options",
    run: () => {
      // @ts-expect-error Exercise malformed inputs from untyped callers.
      compareGeometryEdges(valid, valid, [])
    },
    message: "options must be an object",
  },
  {
    label: "string distance",
    run: () => {
      // @ts-expect-error Exercise malformed inputs from untyped callers.
      compareGeometryEdges(valid, valid, { maxDistancePx: "1.5" })
    },
    message: "maxDistancePx",
  },
  {
    label: "null fraction",
    run: () => {
      // @ts-expect-error Exercise malformed inputs from untyped callers.
      compareGeometryEdges(valid, valid, { maxUnmatchedFraction: null })
    },
    message: "maxUnmatchedFraction",
  },
])("rejects $label without coercion or silent defaults", ({ run, message }) => {
  expect(run).toThrow(message)
})
