import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { JSDOM } from "jsdom"
import { createCombinedBoardTextures } from "../src/textures"
import { applyJsdomShim } from "../src/utils/jsdom-shim"

test("pcb notes are hidden by default in board textures unless showPcbNotes is enabled", () => {
  const dom = new JSDOM()
  applyJsdomShim(dom)

  const boardData: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "board_1",
    center: { x: 0, y: 0 },
    width: 10,
    height: 8,
    thickness: 1.6,
    material: "fr4",
    num_layers: 2,
  }

  const circuitJson: AnyCircuitElement[] = [
    boardData,
    {
      type: "pcb_note_line",
      pcb_note_line_id: "pcb_note_line_1",
      pcb_component_id: "pcb_component_1",
      x1: -3,
      y1: 1,
      x2: 3,
      y2: 1,
      stroke_width: 0.15,
      layer: "top",
    } as AnyCircuitElement,
  ]

  const hiddenByDefault = createCombinedBoardTextures({
    circuitJson,
    boardData,
    traceTextureResolution: 32,
    visibility: {
      boardBody: false,
      topCopper: false,
      bottomCopper: false,
      topSilkscreen: false,
      bottomSilkscreen: false,
      topMask: false,
      bottomMask: false,
    },
  })

  expect(hiddenByDefault.topBoard).toBeNull()

  const explicitlyShown = createCombinedBoardTextures({
    circuitJson,
    boardData,
    traceTextureResolution: 32,
    showPcbNotes: true,
    visibility: {
      boardBody: false,
      topCopper: false,
      bottomCopper: false,
      topSilkscreen: false,
      bottomSilkscreen: false,
      topMask: false,
      bottomMask: false,
    },
  })

  expect(explicitlyShown.topBoard).not.toBeNull()
  expect(explicitlyShown.topBoard?.image).toBeDefined()
})
