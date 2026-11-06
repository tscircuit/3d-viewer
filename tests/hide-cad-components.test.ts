import type { AnyCircuitElement } from "circuit-json"
import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { convertCircuitJsonTo3dSvg } from "../src/convert-circuit-json-to-3d-svg"
import { applyJsdomShim } from "../src/utils/jsdom-shim"
import circuitJson from "./assets/capacitor-resistor-default-circuit.json"

test("hideCadComponents and cadComponentsDisabled omit soldered CAD components", async () => {
  const dom = new JSDOM()
  applyJsdomShim(dom)

  const baseOptions = {
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

  const withComponentsSvg = await convertCircuitJsonTo3dSvg(
    circuitJson as AnyCircuitElement[],
    baseOptions,
  )
  const hiddenComponentsSvg = await convertCircuitJsonTo3dSvg(
    circuitJson as AnyCircuitElement[],
    {
      ...baseOptions,
      hideCadComponents: true,
    },
  )
  const disabledComponentsSvg = await convertCircuitJsonTo3dSvg(
    circuitJson as AnyCircuitElement[],
    {
      ...baseOptions,
      cadComponentsDisabled: true,
    },
  )

  expect(hiddenComponentsSvg.length).toBeLessThan(withComponentsSvg.length)
  expect(disabledComponentsSvg).toBe(hiddenComponentsSvg)
  expect(hiddenComponentsSvg).toMatchSvgSnapshot(import.meta.path)
})
