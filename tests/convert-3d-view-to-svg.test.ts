import type { AnySoupElement } from "@tscircuit/soup"
import { expect, test } from "bun:test"
import { convert3dCircuitToSvg } from "../src/three-components/convert-3d-circuit-to-svg.tsx"
import circuitJson from "./assets/circuit.json"

test("convert 3d view to svg of a single resistor component", async () => {
  const options = {
    width: 800,
    height: 600,
    backgroundColor: "#ffffff",
    padding: 20,
    zoom: 50,
    viewAngle: "isometric",
    camera: {
      position: {
        x: 50,
        y: 50,
        z: 100
      },
      lookAt: {
        x: 0,
        y: 0,
        z: 0
      }
    }
  }

  const svgString = await convert3dCircuitToSvg(circuitJson as AnySoupElement[], options)

  expect(svgString).toMatchSvgSnapshot(import.meta.path)
})
