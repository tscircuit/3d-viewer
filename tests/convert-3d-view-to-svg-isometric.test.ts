import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { JSDOM } from "jsdom"
import { convertCircuitJsonTo3dSvg } from "../src/convert-circuit-json-to-3d-svg.ts"
import { applyJsdomShim } from "../src/utils/jsdom-shim.ts"
import circuitJson from "./assets/capacitor-resistor-default-circuit.json"

test("convert 3d view to svg of capacitor and resistor circuit in isometric view", async () => {
  const dom = new JSDOM()
  applyJsdomShim(dom)

  const options = {
    width: 800,
    height: 600,
    backgroundColor: "#ffffff",
    padding: 20,
    zoom: 9,
    viewAngle: "isometric" as const,
    camera: {
      position: {
        x: 60,
        y: -60,
        z: 60,
      },
      lookAt: {
        x: 0,
        y: 0,
        z: 0,
      },
    },
  }

  const svgString = await convertCircuitJsonTo3dSvg(
    circuitJson as AnyCircuitElement[],
    options,
  )

  expect(svgString).toMatchSvgSnapshot(import.meta.path)
})
