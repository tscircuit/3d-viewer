import { expect, spyOn, test } from "bun:test"
import { type Canvas, createCanvas } from "@napi-rs/canvas"
import type { PcbBoard, PcbCopperPour } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { CanvasTexture } from "three"
import { createCopperPourTextureForLayer } from "../src/textures/create-copper-pour-texture-for-layer"

test("copper pours render fully opaque with one draw per coverage group", () => {
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
  const previousDocument = globalThis.document
  const drawElements = spyOn(CircuitToCanvasDrawer.prototype, "drawElements")
  const textures: CanvasTexture[] = []
  Object.assign(globalThis, {
    document: { createElement: () => createCanvas(1, 1) },
  })

  try {
    for (const layer of ["top", "bottom"] as const) {
      const common = { type: "pcb_copper_pour", layer } as const
      const pours: PcbCopperPour[] = [
        {
          ...common,
          pcb_copper_pour_id: "covered_rect",
          covered_with_solder_mask: true,
          shape: "rect",
          center: { x: -2.5, y: 0 },
          width: 3,
          height: 6,
        },
        {
          ...common,
          pcb_copper_pour_id: "covered_polygon",
          covered_with_solder_mask: true,
          shape: "polygon",
          points: [
            { x: -0.75, y: -3 },
            { x: 0.75, y: -3 },
            { x: 0, y: 3 },
          ],
        },
        {
          ...common,
          pcb_copper_pour_id: "exposed_brep",
          covered_with_solder_mask: false,
          shape: "brep",
          brep_shape: {
            outer_ring: {
              vertices: [
                { x: 1, y: -3 },
                { x: 4, y: -3 },
                { x: 4, y: 3 },
                { x: 1, y: 3 },
              ],
            },
            inner_rings: [
              {
                vertices: [
                  { x: 2, y: -0.5 },
                  { x: 3, y: -0.5 },
                  { x: 3, y: 0.5 },
                  { x: 2, y: 0.5 },
                ],
              },
            ],
          },
        },
      ]

      for (const onlyCoveredBySoldermask of [false, true]) {
        drawElements.mockClear()
        const texture = createCopperPourTextureForLayer({
          layer,
          circuitJson: [board, ...pours],
          boardData: board,
          traceTextureResolution: 10,
          copperColor: "#ab782c",
          onlyCoveredBySoldermask,
        })
        expect(texture).not.toBeNull()
        textures.push(texture!)
        const ctx = (texture!.image as Canvas).getContext("2d")
        const pixel = (x: number, y: number) =>
          Array.from(ctx.getImageData(x, y, 1, 1).data)

        // Check actual pixels as well as calls, so neither 50% alpha nor the
        // old eight-pass workaround can satisfy this regression test.
        expect(pixel(25, 50)).toEqual([171, 120, 44, 255])
        expect(pixel(50, 50)).toEqual([171, 120, 44, 255])
        expect(pixel(65, 50)).toEqual(
          onlyCoveredBySoldermask ? [0, 0, 0, 0] : [171, 120, 44, 255],
        )
        expect(pixel(75, 50)).toEqual([0, 0, 0, 0])
        expect(pixel(5, 5)).toEqual([0, 0, 0, 0])
        expect(drawElements).toHaveBeenCalledTimes(
          onlyCoveredBySoldermask ? 1 : 2,
        )
      }
    }
  } finally {
    for (const texture of textures) texture.dispose()
    drawElements.mockRestore()
    Object.assign(globalThis, { document: previousDocument })
  }
})
