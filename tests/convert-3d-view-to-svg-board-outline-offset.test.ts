import type { AnyCircuitElement } from "circuit-json"
import { expect, test } from "bun:test"
import { convertCircuitJsonTo3dSvg } from "../src/convert-circuit-json-to-3d-svg.ts"
import circuitJson from "./assets/board-outline-offset-circuit-json.json"
import widthcircuitJson from "./assets/board-outline-offset-with-width-height.json"
import { applyJsdomShim } from "../src/utils/jsdom-shim.ts"
import { JSDOM } from "jsdom"

test("outlineoffset with outline", async () => {
  const dom = new JSDOM()
  applyJsdomShim(dom)

  const options = {
    width: 1000,
    height: 1000,
    backgroundColor: "#ffffff",
    padding: 20,
    zoom: 1,
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
    circuitJson as AnyCircuitElement[],
    options,
  )

  expect(svgString).toMatchSvgSnapshot(
    import.meta.path,
    "outlineoffset-outline",
  )
})

test("outlineoffset with width and height", async () => {
  const dom = new JSDOM()
  applyJsdomShim(dom)

  const options = {
    width: 1000,
    height: 1000,
    backgroundColor: "#ffffff",
    padding: 20,
    zoom: 1,
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
    widthcircuitJson as AnyCircuitElement[],
    options,
  )

  expect(svgString).toMatchSvgSnapshot(
    import.meta.path,
    "outlineoffset-width-height",
  )
})
