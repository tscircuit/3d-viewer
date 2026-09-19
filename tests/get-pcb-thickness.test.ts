import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  DEFAULT_BOARD_THICKNESS,
  DEFAULT_PANEL_BOARD_THICKNESS,
  getPcbThicknessFromCircuitJson,
} from "../src/utils/get-pcb-thickness"

test("uses the first board in a panel, not the 1.2mm non-panel default", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_panel",
      pcb_panel_id: "panel1",
      width: 50,
      height: 20,
      center: { x: 0, y: 0 },
      covered_with_solder_mask: true,
    } as AnyCircuitElement,
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      pcb_panel_id: "panel1",
      width: 20,
      height: 15,
      center: { x: 0, y: 0 },
      thickness: 2.2,
      num_layers: 2,
      material: "fr4",
    },
  ]

  expect(getPcbThicknessFromCircuitJson(circuitJson)).toBe(2.2)
})

test("defaults panel boards without thickness to 1.4mm", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_panel",
      pcb_panel_id: "panel1",
      width: 50,
      height: 20,
      center: { x: 0, y: 0 },
      covered_with_solder_mask: true,
    } as AnyCircuitElement,
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      pcb_panel_id: "panel1",
      width: 20,
      height: 15,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
    } as AnyCircuitElement,
  ]

  expect(getPcbThicknessFromCircuitJson(circuitJson)).toBe(
    DEFAULT_PANEL_BOARD_THICKNESS,
  )
})

test("falls back to panel.thickness when child boards omit it", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_panel",
      pcb_panel_id: "panel1",
      width: 50,
      height: 20,
      thickness: 1.6,
      center: { x: 0, y: 0 },
      covered_with_solder_mask: true,
    } as AnyCircuitElement,
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      pcb_panel_id: "panel1",
      width: 20,
      height: 15,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
    } as AnyCircuitElement,
  ]

  expect(getPcbThicknessFromCircuitJson(circuitJson)).toBe(1.6)
})

test("uses 1.2mm for a standalone board that omits thickness", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      width: 20,
      height: 15,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
    } as AnyCircuitElement,
  ]

  expect(getPcbThicknessFromCircuitJson(circuitJson)).toBe(
    DEFAULT_BOARD_THICKNESS,
  )
})
