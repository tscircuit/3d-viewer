import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { JSDOM } from "jsdom"
import { convertCircuitJsonTo3dSvg } from "../src/convert-circuit-json-to-3d-svg.ts"
import { applyJsdomShim } from "../src/utils/jsdom-shim.ts"
import { calculateOutlineBounds } from "../src/utils/outline-bounds"

const atariOutline = [
  { x: -22.5, y: 24.5 },
  { x: 22.5, y: 24.5 },
  { x: 22.5, y: 16.5 },
  { x: 20.5, y: 16.5 },
  { x: 20.5, y: 12.5 },
  { x: 22.5, y: 12.5 },
  { x: 22.5, y: 2.5 },
  { x: 18, y: -1.5 },
  { x: 18, y: -18 },
  { x: -18, y: -18 },
  { x: -18, y: -1.5 },
  { x: -22.5, y: 2.5 },
  { x: -22.5, y: 12.5 },
  { x: -20.5, y: 12.5 },
  { x: -20.5, y: 16.5 },
  { x: -22.5, y: 16.5 },
  { x: -22.5, y: 24.5 },
]

const atariBoardData = {
  type: "pcb_board" as const,
  pcb_board_id: "test-board",
  width: 45,
  height: 45,
  center: { x: 0, y: 0 },
  thickness: 1.6,
  material: "fr4" as const,
  num_layers: 2,
  outline: atariOutline,
}

test("calculate outline bounds for Atari-shaped board", () => {
  const bounds = calculateOutlineBounds(atariBoardData)

  expect(bounds.minX).toBe(-22.5)
  expect(bounds.maxX).toBe(22.5)
  expect(bounds.minY).toBe(-18)
  expect(bounds.maxY).toBe(24.5)
  expect(bounds.width).toBe(45)
  expect(bounds.height).toBe(42.5)
  expect(bounds.centerX).toBe(0)
  expect(bounds.centerY).toBe(3.25)
})

test("calculate outline bounds for rectangular board without outline", () => {
  const rectangularBoard = {
    type: "pcb_board" as const,
    pcb_board_id: "test-board",
    width: 40,
    height: 30,
    center: { x: 5, y: 10 },
    thickness: 1.6,
    material: "fr4" as const,
    num_layers: 2,
  }

  const bounds = calculateOutlineBounds(rectangularBoard)

  expect(bounds.minX).toBe(-15) // center.x - width/2
  expect(bounds.maxX).toBe(25) // center.x + width/2
  expect(bounds.minY).toBe(-5) // center.y - height/2
  expect(bounds.maxY).toBe(25) // center.y + height/2
  expect(bounds.width).toBe(40)
  expect(bounds.height).toBe(30)
  expect(bounds.centerX).toBe(5)
  expect(bounds.centerY).toBe(10)
})

test("convert 3d view to svg with Atari board outline", async () => {
  const dom = new JSDOM()
  applyJsdomShim(dom)

  const circuitJson: AnyCircuitElement[] = [
    atariBoardData as any,
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "test-pad",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      layer: "top",
      shape: "rect",
    } as any,
  ]

  const options = {
    width: 800,
    height: 600,
    backgroundColor: "#ffffff",
    padding: 20,
    zoom: 9,
    viewAngle: "top" as const,
    camera: {
      position: { x: 0, y: 0, z: 100 },
      lookAt: { x: 0, y: 0, z: 0 },
    },
  }

  const svgString = await convertCircuitJsonTo3dSvg(circuitJson, options)

  expect(svgString).toContain("rgb(0,72,50)")

  const redSvgString = await convertCircuitJsonTo3dSvg(
    [{ ...atariBoardData, solder_mask_color: "red" } as any, circuitJson[1]!],
    options,
  )
  expect(redSvgString).toContain("rgb(101,2,2)")
})

test("panel SVG color comes from its first contained board", async () => {
  const dom = new JSDOM()
  applyJsdomShim(dom)

  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "unrelated-board",
      center: { x: 0, y: 0 },
      width: 5,
      height: 5,
      thickness: 1.6,
      material: "fr4",
      num_layers: 2,
      solder_mask_color: "red",
    } as any,
    {
      type: "pcb_panel",
      pcb_panel_id: "panel-1",
      center: { x: 0, y: 0 },
      width: 20,
      height: 10,
    } as any,
    {
      type: "pcb_board",
      pcb_board_id: "panel-board",
      pcb_panel_id: "panel-1",
      center: { x: 0, y: 0 },
      width: 8,
      height: 6,
      thickness: 1.6,
      material: "fr4",
      num_layers: 2,
      solder_mask_color: "purple",
    } as any,
  ]

  const svgString = await convertCircuitJsonTo3dSvg(circuitJson, {
    width: 800,
    height: 600,
    backgroundColor: "#ffffff",
    padding: 20,
    zoom: 9,
    viewAngle: "top",
    camera: {
      position: { x: 0, y: 0, z: 100 },
      lookAt: { x: 0, y: 0, z: 0 },
    },
  })

  expect(svgString).toContain("rgb(21,0,138)")
  expect(svgString).not.toContain("rgb(101,2,2)")
})
