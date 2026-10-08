import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { JSDOM } from "jsdom"
import { convertCircuitJsonTo3dSvg } from "../src/convert-circuit-json-to-3d-svg"
import { applyJsdomShim } from "../src/utils/jsdom-shim"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_cad_cable_repro",
    center: { x: 0, y: 0 },
    width: 30,
    height: 20,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "cad_cable",
    cad_cable_id: "cad_cable_repro",
    name: "JST PH cable",
    cableprinter_string: "jst_ph_pins4",
    from_source_component_id: "source_component_motor",
    to_source_component_id: "source_component_controller",
    from_connector_pin1_position: { x: -10, y: -1, z: 4 },
    to_connector_pin1_position: { x: 10, y: -1, z: 4 },
    path: [
      { x: -10, y: 0, z: 4 },
      { x: -8, y: 0, z: 8 },
      { x: 0, y: 0, z: 12 },
      { x: 8, y: 0, z: 8 },
      { x: 10, y: 0, z: 4 },
    ],
  },
] as unknown as AnyCircuitElement[]

test("convert a CAD cable to an SVG snapshot", async () => {
  const dom = new JSDOM()
  applyJsdomShim(dom)

  const svg = await convertCircuitJsonTo3dSvg(circuitJson, {
    width: 800,
    height: 600,
    backgroundColor: "#ffffff",
    padding: 20,
    zoom: 1.5,
    camera: {
      position: { x: 60, y: -60, z: 50 },
      lookAt: { x: 0, y: 0, z: 5 },
    },
  })

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
