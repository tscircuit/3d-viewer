import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import type { CanvasTexture } from "three"
import { createCombinedBoardTextures } from "../src/textures/create-combined-board-textures"

for (const padLayer of ["top", "bottom"] as const) {
  for (const routeVia of [false, true]) {
    test(`tented ${routeVia ? "route" : "standalone"} via at a ${padLayer} pad has a full hole on both sides`, () => {
      const previousDocument = globalThis.document
      Object.assign(globalThis, {
        document: { createElement: () => createCanvas(1, 1) },
      })
      try {
        const board: PcbBoard = {
          type: "pcb_board",
          pcb_board_id: "board",
          center: { x: 10, y: 5 },
          width: 6,
          height: 4,
          thickness: 1.6,
          num_layers: 2,
          material: "fr4",
        }
        const circuitJson = [
          board,
          {
            type: "pcb_smtpad",
            pcb_smtpad_id: "pad",
            pcb_component_id: "component",
            shape: "rect",
            x: 10,
            y: 5.5,
            width: 2,
            height: 2,
            layer: padLayer,
          },
          routeVia
            ? {
                type: "pcb_trace",
                pcb_trace_id: "trace",
                route: [
                  {
                    route_type: "via",
                    x: 11,
                    y: 5.5,
                    from_layer: "top",
                    to_layer: "bottom",
                    hole_diameter: 1,
                    outer_diameter: 1.4,
                    tented_on_top: true,
                    tented_on_bottom: true,
                  },
                ],
              }
            : {
                type: "pcb_via",
                pcb_via_id: "via",
                x: 11,
                y: 5.5,
                hole_diameter: 1,
                outer_diameter: 1.4,
                layers: ["top", "bottom"],
                tented_on_top: true,
                tented_on_bottom: true,
              },
          {
            type: "pcb_via",
            pcb_via_id: "unrelated",
            x: 12,
            y: 4,
            hole_diameter: 0.4,
            outer_diameter: 0.8,
            layers: ["top", "bottom"],
            tented_on_top: true,
            tented_on_bottom: true,
          },
        ] as AnyCircuitElement[]
        const textures = createCombinedBoardTextures({
          circuitJson,
          boardData: board,
          traceTextureResolution: 50,
        })
        for (const layer of ["top", "bottom"] as const) {
          const texture = (
            layer === "top" ? textures.topBoard : textures.bottomBoard
          )!
          const pixel = (x: number, y: number) =>
            Array.from(
              texture.image
                .getContext("2d")
                .getImageData(
                  Math.floor((x - 7) * 50),
                  Math.floor((layer === "top" ? 7 - y : y - 3) * 50),
                  1,
                  1,
                ).data,
            ) as number[]
          // Both halves must be clear, including the half beyond the pad and
          // the opposite board side that has no pad opening at all.
          expect(pixel(10.7, 5.5)[3]).toBe(0)
          expect(pixel(11.3, 5.5)[3]).toBe(0)
          const ring = pixel(11.6, 5.5)
          expect(ring[3]).toBe(255)
          expect(ring[1]!).toBeGreaterThan(ring[0]!)
          // Ordinary tenting remains intact when a via is away from a pad.
          expect(pixel(12, 4)[3]).toBe(255)
        }
        for (const texture of Object.values(textures))
          (texture as CanvasTexture | null)?.dispose()
      } finally {
        Object.assign(globalThis, { document: previousDocument })
      }
    })
  }
}

test("a covered pad does not open a neighboring tented via", () => {
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    document: { createElement: () => createCanvas(1, 1) },
  })
  try {
    const board: PcbBoard = {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 6,
      height: 4,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    }
    const textures = createCombinedBoardTextures({
      boardData: board,
      traceTextureResolution: 50,
      circuitJson: [
        board,
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "pad",
          pcb_component_id: "component",
          shape: "rect",
          x: 0,
          y: 0,
          width: 2,
          height: 2,
          layer: "top",
          is_covered_with_solder_mask: true,
        },
        {
          type: "pcb_via",
          pcb_via_id: "via",
          x: 1,
          y: 0,
          hole_diameter: 1,
          outer_diameter: 1.4,
          layers: ["top", "bottom"],
          tented_on_top: true,
          tented_on_bottom: true,
        },
      ],
    })
    expect(
      textures.topBoard!.image.getContext("2d").getImageData(200, 100, 1, 1)
        .data[3],
    ).toBe(255)
    for (const texture of Object.values(textures))
      (texture as CanvasTexture | null)?.dispose()
  } finally {
    Object.assign(globalThis, { document: previousDocument })
  }
})

test("an exposed pad touching only the via annulus still leaves a full bore", async () => {
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    document: { createElement: () => createCanvas(1, 1) },
  })
  try {
    const board: PcbBoard = {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 6,
      height: 4,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    }
    const via = {
      type: "pcb_via",
      pcb_via_id: "via",
      x: 1.6,
      y: 0,
      hole_diameter: 1,
      outer_diameter: 1.4,
      layers: ["top", "bottom"],
      tented_on_top: true,
      tented_on_bottom: true,
    } as const
    const textures = createCombinedBoardTextures({
      boardData: board,
      traceTextureResolution: 50,
      circuitJson: [
        board,
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "pad",
          pcb_component_id: "component",
          shape: "rect",
          x: 0,
          y: 0,
          width: 2,
          height: 2,
          layer: "top",
        },
        via,
      ] as AnyCircuitElement[],
    })
    for (const texture of [textures.topBoard!, textures.bottomBoard!]) {
      const ctx = texture.image.getContext("2d")
      expect(ctx.getImageData(230, 100, 1, 1).data[3]).toBe(0)
      expect(ctx.getImageData(260, 100, 1, 1).data[3]).toBe(255)
    }
    for (const texture of Object.values(textures))
      (texture as CanvasTexture | null)?.dispose()
  } finally {
    Object.assign(globalThis, { document: previousDocument })
  }
})
