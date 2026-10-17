import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getVisibleCadComponents } from "../src/hooks/useHiddenCadComponents"

const sampleCircuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    thickness: 1.4,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "cad_component",
    cad_component_id: "cad_component_0",
    pcb_component_id: "pcb_component_0",
    source_component_id: "source_component_0",
    position: { x: 0, y: 0, z: 0.7 },
    rotation: { x: 0, y: 0, z: 0 },
    footprinter_string: "0402",
    anchor_alignment: "center",
    model_object_fit: "contain_within_bounds",
  },
  {
    type: "cad_component",
    cad_component_id: "cad_component_1",
    pcb_component_id: "pcb_component_1",
    source_component_id: "source_component_1",
    position: { x: 2, y: 0, z: 0.7 },
    rotation: { x: 0, y: 0, z: 0 },
    footprinter_string: "0603",
    anchor_alignment: "center",
    model_object_fit: "contain_within_bounds",
  },
]

test("hideCadComponents and cadComponentsDisabled props hide all cad_components", () => {
  expect(
    getVisibleCadComponents({
      circuitJson: sampleCircuitJson,
    }).map((c) => c.cad_component_id),
  ).toEqual(["cad_component_0", "cad_component_1"])

  expect(
    getVisibleCadComponents({
      circuitJson: sampleCircuitJson,
      hiddenCadComponentIds: new Set(["cad_component_0"]),
    }).map((c) => c.cad_component_id),
  ).toEqual(["cad_component_1"])

  expect(
    getVisibleCadComponents({
      circuitJson: sampleCircuitJson,
      hideCadComponents: true,
    }),
  ).toEqual([])

  expect(
    getVisibleCadComponents({
      circuitJson: sampleCircuitJson,
      cadComponentsDisabled: true,
    }),
  ).toEqual([])
})
