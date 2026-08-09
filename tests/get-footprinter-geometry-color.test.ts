import { describe, expect, test } from "bun:test"
import { getFootprinterGeometryColor } from "../src/utils/get-footprinter-geometry-color"

describe("getFootprinterGeometryColor", () => {
  test("makes generated capacitor bodies yellow", () => {
    expect(getFootprinterGeometryColor("#333", "simple_capacitor")).toBe(
      "yellow",
    )
    expect(getFootprinterGeometryColor("#856c4d", "simple_capacitor")).toBe(
      "yellow",
    )
  })

  test("keeps generated capacitor terminals metallic", () => {
    expect(getFootprinterGeometryColor("#ccc", "simple_capacitor")).toBe("#ccc")
    expect(getFootprinterGeometryColor("silver", "simple_capacitor")).toBe(
      "silver",
    )
  })

  test("does not recolor other generated components", () => {
    expect(getFootprinterGeometryColor("#333", "simple_resistor")).toBe("#333")
  })
})
