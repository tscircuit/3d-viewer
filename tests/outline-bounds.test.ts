import type { AnyCircuitElement } from "circuit-json"
import { expect, test } from "bun:test"
import { convertCircuitJsonTo3dSvg } from "../src/convert-circuit-json-to-3d-svg.ts"
import { applyJsdomShim } from "../src/utils/jsdom-shim.ts"
import { JSDOM } from "jsdom"
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

  // Verify that the SVG contains green soldermask colors
  expect(svgString).toContain("rgb(39,89,56)") // Dark green soldermask
  expect(svgString).toContain("rgb(51,114,73)") // Light green traces
})
