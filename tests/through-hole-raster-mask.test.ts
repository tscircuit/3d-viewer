import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  getRasterizedThroughHolesForLayer,
  makeMaskPixelsOpaque,
} from "../src/textures/create-combined-board-textures"

test("vias and plated holes share the raster-removal path", () => {
  const elements = [
    {
      type: "pcb_via",
      pcb_via_id: "via-top-bottom",
      x: 0,
      y: 0,
      hole_diameter: 0.3,
      outer_diameter: 0.6,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "plated-top",
      shape: "circle",
      x: 1,
      y: 0,
      hole_diameter: 0.8,
      outer_diameter: 1.4,
      layers: ["top"],
    },
    {
      type: "pcb_hole",
      pcb_hole_id: "unplated",
      x: 2,
      y: 0,
      hole_diameter: 1,
    },
  ] as AnyCircuitElement[]

  expect(
    getRasterizedThroughHolesForLayer(elements, "top").map(
      (element) => element.type,
    ),
  ).toEqual(["pcb_via", "pcb_plated_hole"])
  expect(getRasterizedThroughHolesForLayer(elements, "bottom")).toHaveLength(1)
})

test("through-hole raster masks fully erase antialiased edge pixels", () => {
  const pixels = new Uint8ClampedArray([
    255, 255, 255, 0, 255, 255, 255, 1, 255, 255, 255, 128, 255, 255, 255, 255,
  ])

  makeMaskPixelsOpaque(pixels)

  expect(Array.from(pixels)).toEqual([
    255, 255, 255, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    255,
  ])
})
