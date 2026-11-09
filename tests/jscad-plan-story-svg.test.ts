import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { JSDOM } from "jsdom"
import { convertCircuitJsonTo3dSvg } from "../src/convert-circuit-json-to-3d-svg"
import { applyJsdomShim } from "../src/utils/jsdom-shim"

test("renders CadComponentWithJscadPlan story board and JSCAD cube to 3d svg", async () => {
  const dom = new JSDOM()
  applyJsdomShim(dom)

  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "source_component",
      source_component_id: "source_component_0",
      name: "U1",
      ftype: "simple_chip",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_0",
      source_component_id: "source_component_0",
      center: { x: 0, y: 0 },
      width: 5,
      height: 5,
      layer: "top",
      rotation: 0,
      obstructs_within_bounds: false,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_0",
      pcb_component_id: "pcb_component_0",
      source_component_id: "source_component_0",
      position: { x: 0, y: 0, z: 0.8 },
      rotation: { x: 0, y: 0, z: 0 },
      anchor_alignment: "center",
      model_object_fit: "contain_within_bounds",
      footprinter_string: "soic8",
      model_jscad: {
        type: "cube",
        size: 5,
      },
    },
  ]

  const svgString = await convertCircuitJsonTo3dSvg(circuitJson, {
    width: 800,
    height: 600,
    backgroundColor: "#ffffff",
    padding: 20,
    zoom: 6,
    viewAngle: "isometric",
    camera: {
      position: { x: 40, y: -40, z: 45 },
      lookAt: { x: 0, y: 0, z: 0 },
    },
  })

  expect(svgString).toMatchSvgSnapshot(import.meta.path)
})
