import { expect, test } from "bun:test"
import * as THREE from "three"
import { createSimplifiedBoardGeom } from "../src/soup-to-3d"
import { applySoldermaskSurfaceFilter } from "../src/textures/soldermask/apply-soldermask-surface-filter"
import { getSoldermaskPalette } from "../src/textures/soldermask/soldermask-drawing"
import { createBoardMaterial } from "../src/utils/create-board-material"
import {
  FLUX_SOLDERMASK_COLOR_HEX,
  getBoardSoldermaskColor,
  resolveBoardSoldermaskColor,
  resolveSoldermaskColor,
  soldermaskColorToCss,
} from "../src/utils/soldermask-color"

const toSrgbHex = (color: THREE.Color) =>
  `#${color.getHexString(THREE.SRGBColorSpace)}`

test("uses Flux's exact 3D soldermask preset colors", () => {
  for (const [preset, expectedHex] of Object.entries(
    FLUX_SOLDERMASK_COLOR_HEX,
  )) {
    expect(toSrgbHex(resolveSoldermaskColor(preset))).toBe(expectedHex)
  }
})

test("defaults missing and not_specified soldermask colors to Flux green", () => {
  expect(toSrgbHex(resolveSoldermaskColor())).toBe(
    FLUX_SOLDERMASK_COLOR_HEX.green,
  )
  expect(toSrgbHex(resolveSoldermaskColor("not_specified"))).toBe(
    FLUX_SOLDERMASK_COLOR_HEX.green,
  )
})

test("passes custom CSS colors through THREE.Color like Flux", () => {
  expect(toSrgbHex(resolveSoldermaskColor("#123456"))).toBe("#123456")
  expect(toSrgbHex(resolveSoldermaskColor("rebeccapurple"))).toBe("#663399")
  expect(toSrgbHex(resolveSoldermaskColor(""))).toBe("#ffffff")
})

test("reads solder_mask_color from Circuit JSON", () => {
  const board = {
    type: "pcb_board",
    pcb_board_id: "red-board",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    thickness: 1.6,
    material: "fr4",
    num_layers: 2,
    solder_mask_color: "red",
  } as any

  expect(getBoardSoldermaskColor(board)).toBe("red")
  expect(toSrgbHex(resolveBoardSoldermaskColor(board))).toBe("#650202")
})

test("draws Flux's translucent mask color over both substrate and copper", () => {
  const board = {
    type: "pcb_board",
    pcb_board_id: "blue-board",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    thickness: 1.6,
    material: "fr4",
    num_layers: 2,
    solder_mask_color: "blue",
  } as any

  const palette = getSoldermaskPalette(board)
  expect(palette.soldermask).toBe("rgb(0,74,171)")
  expect(palette.soldermaskOverCopper).toBe("rgb(76,91,164)")
  expect(soldermaskColorToCss(resolveBoardSoldermaskColor(board))).toBe(
    "rgb(0,74,171)",
  )
})

test("grades only pixels in the isolated soldermask texture", () => {
  const pixels = new Uint8ClampedArray([221, 221, 221, 255, 199, 161, 99, 0])
  const ctx = {
    getImageData: () => ({ data: pixels, width: 2, height: 1 }),
    putImageData: () => {},
  } as unknown as CanvasRenderingContext2D

  applySoldermaskSurfaceFilter(ctx, 2, 1)

  expect([...pixels.slice(0, 3)]).not.toEqual([221, 221, 221])
  expect([...pixels.slice(4)]).toEqual([199, 161, 99, 0])
})

test("uses the soldermask color on FR4 board sides", () => {
  const red = resolveSoldermaskColor("red")
  const material = createBoardMaterial({ material: "fr4", color: red })

  expect(toSrgbHex(material.color)).toBe("#650202")
  material.dispose()
})

test("keeps the first contained board's soldermask color for panels", () => {
  const geometry = createSimplifiedBoardGeom([
    {
      type: "pcb_panel",
      pcb_panel_id: "panel-1",
      center: { x: 0, y: 0 },
      width: 20,
      height: 10,
    } as any,
    {
      type: "pcb_board",
      pcb_board_id: "board-in-panel",
      pcb_panel_id: "panel-1",
      center: { x: 0, y: 0 },
      width: 8,
      height: 6,
      thickness: 1.6,
      material: "fr4",
      num_layers: 2,
      solder_mask_color: "purple",
    } as any,
  ])[0] as any
  const purple = resolveSoldermaskColor("purple")

  expect(geometry.color.slice(0, 3)).toEqual([purple.r, purple.g, purple.b])
})
