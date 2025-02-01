import type { AnySoupElement } from "@tscircuit/soup"
import { expect, test } from "bun:test"
import { convertCircuitJsonTo3dSvg } from "../src/convert-circuit-json-to-3d-svg.ts"
import circuitJson from "./assets/capacitor-resistor-default-circuit.json"

test("convert 3d view to svg of capacitor and resistor circuit", async () => {
  const options = {
    width: 800,
    height: 600,
    backgroundColor: "#ffffff",
    padding: 20,
    zoom: 9,
    viewAngle: "top" as const,
    camera: {
      position: {
        x: 0,
        y: 0,
        z: 100,
      },
      lookAt: {
        x: 0,
        y: 0,
        z: 0,
      },
    },
  }

  const svgString = await convertCircuitJsonTo3dSvg(
    circuitJson as AnySoupElement[],
    options,
  )

  expect(svgString).toMatchSvgSnapshot(import.meta.path)
})
