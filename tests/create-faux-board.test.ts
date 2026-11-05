import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { createFauxBoard } from "../src/utils/create-faux-board"

test("createFauxBoard sizes faux board to encompass pcb_component, cad_component.size, and pcb_trace bounds", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_component",
      pcb_component_id: "comp_1",
      source_component_id: "src_1",
      center: { x: 0, y: 0 },
      width: 16,
      height: 12,
      rotation: 0,
      layer: "top",
      obstructs_within_bounds: true,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_1",
      pcb_component_id: "comp_1",
      source_component_id: "src_1",
      position: { x: 0, y: 0, z: 0 },
      size: { x: 20, y: 14, z: 3 },
      anchor_alignment: "center",
      model_object_fit: "contain_within_bounds",
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_1",
      route: [
        { route_type: "wire", x: -4, y: 0, width: 0.2, layer: "top" },
        { route_type: "wire", x: 15, y: 9, width: 0.2, layer: "top" },
      ],
    },
  ]

  const board = createFauxBoard(elements)
  expect(board).not.toBeNull()
  // Max extent X is 15 -> halfWidth = 17 -> width = 34
  // Max extent Y is 9 -> halfHeight = 11 -> height = 22
  expect(board!.width).toBeCloseTo(34)
  expect(board!.height).toBeCloseTo(22)
})

test("createFauxBoard expands bounds using cad_component.size when larger than center point", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "cad_component",
      cad_component_id: "cad_1",
      pcb_component_id: "comp_1",
      source_component_id: "src_1",
      position: { x: 0, y: 0, z: 0 },
      size: { x: 20, y: 14, z: 3 },
      anchor_alignment: "center",
      model_object_fit: "contain_within_bounds",
    },
  ]

  const board = createFauxBoard(elements)
  expect(board).not.toBeNull()
  // halfWidth = 10 + 2 = 12 -> width = 24
  // halfHeight = 7 + 2 = 9 -> height = 18
  expect(board!.width).toBeCloseTo(24)
  expect(board!.height).toBeCloseTo(18)
})

test("createFauxBoard returns null for boardless mechanical CAD assemblies without PCB elements", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "cad_component",
      cad_component_id: "mech_1",
      pcb_component_id: "",
      source_component_id: "src_mech",
      position: { x: 0, y: 0, z: 0 },
      size: { x: 40, y: 40, z: 10 },
      anchor_alignment: "center",
      model_object_fit: "contain_within_bounds",
    },
  ]

  expect(createFauxBoard(elements)).toBeNull()
})
