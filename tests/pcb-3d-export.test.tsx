import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { JSDOM } from "jsdom"
import React from "react"
import {
  CadViewer,
  Pcb3D,
  type Pcb3DProps,
  applyJsdomShim,
  convertCircuitJsonTo3dSvg,
} from "../src/index.tsx"
import circuitJson from "./assets/circuit.json"

test("exports Pcb3D component alias for CadViewer and renders 3D PCB view", async () => {
  expect(Pcb3D).toBe(CadViewer)

  const props: Pcb3DProps = {
    circuitJson: circuitJson as AnyCircuitElement[],
    autoRotateDisabled: true,
  }
  const element = <Pcb3D {...props} />
  expect(element.type).toBe(CadViewer)
  expect(element.props.circuitJson).toBe(props.circuitJson)

  const dom = new JSDOM()
  applyJsdomShim(dom)

  const svgString = await convertCircuitJsonTo3dSvg(
    circuitJson as AnyCircuitElement[],
    {
      width: 800,
      height: 600,
      backgroundColor: "#ffffff",
      padding: 20,
      zoom: 9,
      viewAngle: "top",
    },
  )

  expect(svgString).toMatchSvgSnapshot(import.meta.path)
})
