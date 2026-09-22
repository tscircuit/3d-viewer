import { expect, test } from "bun:test"
import {
  compareGeometryEdges,
  type GeometryEdgeOptions,
  type GeometryImage,
} from "./fixtures/geometry-edge-comparison"

const valid: GeometryImage = {
  width: 3,
  height: 3,
  data: new Uint8Array(36),
}

test.each([
  { label: "zero width", image: { ...valid, width: 0 }, message: "dimensions" },
  {
    label: "negative height",
    image: { ...valid, height: -1 },
    message: "dimensions",
  },
  {
    label: "fractional width",
    image: { ...valid, width: 1.5 },
    message: "dimensions",
  },
  {
    label: "NaN height",
    image: { ...valid, height: NaN },
    message: "dimensions",
  },
  {
    label: "infinite width",
    image: { ...valid, width: Infinity },
    message: "dimensions",
  },
  {
    label: "unsafe size",
    image: { ...valid, width: Number.MAX_SAFE_INTEGER },
    message: "dimensions",
  },
  {
    label: "short data",
    image: { ...valid, data: new Uint8Array(35) },
    message: "length",
  },
  {
    label: "long data",
    image: { ...valid, data: new Uint8Array(37) },
    message: "length",
  },
  {
    label: "different dimensions",
    image: { ...valid, width: 1, height: 9 },
    message: "dimensions must match",
  },
  {
    label: "negative distance",
    options: { maxDistancePx: -1 },
    message: "maxDistancePx",
  },
  {
    label: "NaN distance",
    options: { maxDistancePx: NaN },
    message: "maxDistancePx",
  },
  {
    label: "infinite distance",
    options: { maxDistancePx: Infinity },
    message: "maxDistancePx",
  },
  {
    label: "negative fraction",
    options: { maxUnmatchedFraction: -0.1 },
    message: "maxUnmatchedFraction",
  },
  {
    label: "fraction over one",
    options: { maxUnmatchedFraction: 1.1 },
    message: "maxUnmatchedFraction",
  },
  {
    label: "NaN fraction",
    options: { maxUnmatchedFraction: NaN },
    message: "maxUnmatchedFraction",
  },
  {
    label: "infinite fraction",
    options: { maxUnmatchedFraction: Infinity },
    message: "maxUnmatchedFraction",
  },
])(
  "rejects $label",
  ({
    image,
    options,
    message,
  }: {
    image?: GeometryImage
    options?: GeometryEdgeOptions
    message: string
  }) => {
    expect(() => compareGeometryEdges(valid, image ?? valid, options)).toThrow(
      message,
    )
    if (image) {
      expect(() => compareGeometryEdges(image, valid)).toThrow(message)
    }
  },
)
