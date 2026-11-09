import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { JSDOM } from "jsdom"
import { convertCircuitJsonTo3dSvg } from "../src/convert-circuit-json-to-3d-svg.ts"
import { applyJsdomShim } from "../src/utils/jsdom-shim.ts"

test("convert 3d view to svg of pin-header footprint and multi-part jscad model", async () => {
  const dom = new JSDOM()
  applyJsdomShim(dom)

  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 24,
      height: 16,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_0",
      pcb_component_id: "pcb_component_0",
      source_component_id: "source_component_0",
      anchor_alignment: "center",
      model_object_fit: "contain_within_bounds",
      position: { x: -4, y: 0, z: 0.8 },
      rotation: { x: 0, y: 0, z: 0 },
      footprinter_string: "pin-header_4",
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_1",
      pcb_component_id: "pcb_component_1",
      source_component_id: "source_component_1",
      anchor_alignment: "center",
      model_object_fit: "contain_within_bounds",
      position: { x: 4, y: 0, z: 0.8 },
      rotation: { x: 0, y: 0, z: 0 },
      model_jscad: [
        {
          type: "colorize",
          color: [0.15, 0.15, 0.15],
          shape: {
            type: "cuboid",
            size: [2.54, 10.16, 2.54],
            center: [0, 0, 1.27],
          },
        },
        {
          type: "colorize",
          color: [0.85, 0.7, 0.2],
          shape: {
            type: "cuboid",
            size: [0.64, 0.64, 6],
            center: [0, -3.81, 2],
          },
        },
        {
          type: "colorize",
          color: [0.85, 0.7, 0.2],
          shape: {
            type: "cuboid",
            size: [0.64, 0.64, 6],
            center: [0, -1.27, 2],
          },
        },
        {
          type: "colorize",
          color: [0.85, 0.7, 0.2],
          shape: {
            type: "cuboid",
            size: [0.64, 0.64, 6],
            center: [0, 1.27, 2],
          },
        },
        {
          type: "colorize",
          color: [0.85, 0.7, 0.2],
          shape: {
            type: "cuboid",
            size: [0.64, 0.64, 6],
            center: [0, 3.81, 2],
          },
        },
      ] as any,
    },
  ]

  const svgString = await convertCircuitJsonTo3dSvg(circuitJson, {
    width: 800,
    height: 600,
    backgroundColor: "#ffffff",
    padding: 20,
    zoom: 3.2,
    viewAngle: "isometric",
    camera: {
      position: { x: 35, y: -45, z: 35 },
      lookAt: { x: 0, y: 0, z: 1 },
    },
  })

  expect(svgString).toMatchSvgSnapshot(import.meta.path)
})
