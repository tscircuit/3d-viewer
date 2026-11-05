import { expect, test } from "bun:test"
import { type Canvas, createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement, PcbBoard, PcbCopperPour } from "circuit-json"
import type { CanvasTexture } from "three"
import { createCombinedBoardTextures } from "../src/textures/create-combined-board-textures"
import { createSoldermaskTextureForLayer } from "../src/textures/create-soldermask-texture-for-layer"

test("uncovered copper pours fully erase soldermask alpha instead of leaving 50% mask", () => {
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    document: { createElement: () => createCanvas(1, 1) },
  })
  const textures: CanvasTexture[] = []

  try {
    const board: PcbBoard = {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    }

    for (const layer of ["top", "bottom"] as const) {
      const pours: PcbCopperPour[] = [
        {
          type: "pcb_copper_pour",
          pcb_copper_pour_id: "uncovered_pour",
          layer,
          covered_with_solder_mask: false,
          shape: "rect",
          center: { x: -2.5, y: 0 },
          width: 3,
          height: 4,
        },
        {
          type: "pcb_copper_pour",
          pcb_copper_pour_id: "covered_pour",
          layer,
          covered_with_solder_mask: true,
          shape: "rect",
          center: { x: 2.5, y: 0 },
          width: 3,
          height: 4,
        },
      ]

      const texture = createSoldermaskTextureForLayer({
        layer,
        circuitJson: [board, ...pours],
        boardData: board,
        traceTextureResolution: 10,
      })
      expect(texture).not.toBeNull()
      textures.push(texture!)

      const ctx = (texture!.image as Canvas).getContext("2d")

      // Uncovered pour cutout must be completely transparent (alpha = 0), not ~128
      expect(ctx.getImageData(25, 50, 1, 1).data[3]).toBe(0)
      // Covered pour remains fully covered by soldermask (alpha = 255)
      expect(ctx.getImageData(75, 50, 1, 1).data[3]).toBe(255)
    }
  } finally {
    for (const texture of textures) texture.dispose()
    Object.assign(globalThis, { document: previousDocument })
  }
})

test("tented via overlapping an uncovered copper pour opens its drill hole on both surfaces", () => {
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    document: { createElement: () => createCanvas(1, 1) },
  })

  try {
    const board: PcbBoard = {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 8,
      height: 4,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    }

    const circuitJson: AnyCircuitElement[] = [
      board,
      {
        type: "pcb_copper_pour",
        pcb_copper_pour_id: "exposed_pour",
        layer: "top",
        covered_with_solder_mask: false,
        shape: "rect",
        center: { x: -2, y: 0 },
        width: 2,
        height: 2,
      },
      {
        type: "pcb_copper_pour",
        pcb_copper_pour_id: "covered_pour",
        layer: "top",
        covered_with_solder_mask: true,
        shape: "rect",
        center: { x: 2, y: 0 },
        width: 2,
        height: 2,
      },
      {
        type: "pcb_via",
        pcb_via_id: "via_in_exposed_pour",
        x: -2,
        y: 0,
        hole_diameter: 0.8,
        outer_diameter: 1.2,
        layers: ["top", "bottom"],
        tented_on_top: true,
        tented_on_bottom: true,
      },
      {
        type: "pcb_via",
        pcb_via_id: "via_in_covered_pour",
        x: 2,
        y: 0,
        hole_diameter: 0.8,
        outer_diameter: 1.2,
        layers: ["top", "bottom"],
        tented_on_top: true,
        tented_on_bottom: true,
      },
    ]

    const textures = createCombinedBoardTextures({
      circuitJson,
      boardData: board,
      traceTextureResolution: 50,
    })

    for (const texture of [textures.topBoard!, textures.bottomBoard!]) {
      const ctx = texture.image.getContext("2d")
      // Via at x = -2 (canvas x = 100, y = 100) inside uncovered pour has open drill hole (alpha = 0)
      expect(ctx.getImageData(100, 100, 1, 1).data[3]).toBe(0)
      // Via at x = +2 (canvas x = 300, y = 100) inside covered pour remains tented (alpha = 255)
      expect(ctx.getImageData(300, 100, 1, 1).data[3]).toBe(255)
    }

    for (const texture of Object.values(textures)) {
      ;(texture as CanvasTexture | null)?.dispose()
    }
  } finally {
    Object.assign(globalThis, { document: previousDocument })
  }
})
