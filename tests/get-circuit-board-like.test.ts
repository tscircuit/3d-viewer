import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getCircuitBoardLikeForViewer } from "../src/utils/get-circuit-board-like"
import { calculateOutlineBounds } from "../src/utils/outline-bounds"

test("frames the panel, not the first child board", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_panel",
      pcb_panel_id: "panel1",
      width: 100,
      height: 60,
      center: { x: 10, y: 5 },
      covered_with_solder_mask: true,
    } as AnyCircuitElement,
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      pcb_panel_id: "panel1",
      width: 40,
      height: 25,
      center: { x: -25, y: 0 },
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
  ]

  const boardLike = getCircuitBoardLikeForViewer(circuitJson)
  expect(boardLike?.width).toBe(100)
  expect(boardLike?.height).toBe(60)
  expect(boardLike?.center).toEqual({ x: 10, y: 5 })

  const bounds = calculateOutlineBounds(boardLike!)
  expect(bounds.width).toBe(100)
  expect(bounds.height).toBe(60)
  expect(bounds.centerX).toBe(10)
  expect(bounds.centerY).toBe(5)
})

test("falls back to a standalone board when there is no panel", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      width: 20,
      height: 15,
      center: { x: 1, y: 2 },
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
  ]

  const boardLike = getCircuitBoardLikeForViewer(circuitJson)
  expect(boardLike?.pcb_board_id).toBe("board1")
  expect(boardLike?.width).toBe(20)
})
