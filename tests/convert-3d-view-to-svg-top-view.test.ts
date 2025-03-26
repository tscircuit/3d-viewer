import type { AnyCircuitElement } from "circuit-json"
import { expect, test } from "bun:test"
import { convertCircuitJsonTo3dSvg } from "../src/convert-circuit-json-to-3d-svg.ts"
import circuitJson from "./assets/usb-c-flashlight.json"
import { applyJsdomShim } from "../src/utils/jsdom-shim.ts"
import { JSDOM } from "jsdom"

test("convert 3d view to svg of a single resistor component top view", async () => {
  const dom = new JSDOM()
  applyJsdomShim(dom)

  const svgString = await convertCircuitJsonTo3dSvg(
    circuitJson as AnyCircuitElement[],
  )

  expect(svgString).toMatchSvgSnapshot(import.meta.path)
})
