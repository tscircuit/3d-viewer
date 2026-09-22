import { expect, test } from "bun:test"
import type { PcbBoard, PcbVia } from "circuit-json"
import { isOpenSurfaceAperture } from "../src/textures/silkscreen/silkscreen-drawing"

test("standalone via aperture selection respects tenting precedence", () => {
  const board: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    thickness: 1.4,
    num_layers: 2,
    material: "fr4",
    default_via_tented_on_top: true,
    default_via_tented_on_bottom: false,
  }
  const via: PcbVia = {
    type: "pcb_via",
    pcb_via_id: "via",
    x: 0,
    y: 0,
    outer_diameter: 0.6,
    hole_diameter: 0.3,
    layers: ["top", "bottom"],
  }

  expect(isOpenSurfaceAperture(via, "top", board, true)).toBe(false)
  expect(isOpenSurfaceAperture(via, "bottom", board, true)).toBe(true)

  const overriddenVia = {
    ...via,
    tented_on_top: false,
    tented_on_bottom: true,
  }
  expect(isOpenSurfaceAperture(overriddenVia, "top", board, true)).toBe(true)
  expect(isOpenSurfaceAperture(overriddenVia, "bottom", board, true)).toBe(
    false,
  )
  expect(isOpenSurfaceAperture(overriddenVia, "bottom", board, false)).toBe(
    true,
  )
  expect(isOpenSurfaceAperture(via, "top", undefined, true)).toBe(true)

  const legacyVia = { ...via, is_tented: false }
  expect(isOpenSurfaceAperture(legacyVia, "top", board, true)).toBe(true)
  expect(
    isOpenSurfaceAperture(
      { ...legacyVia, tented_on_top: true },
      "top",
      board,
      true,
    ),
  ).toBe(false)
})
