import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { createCombinedBoardTextures } from "../src/textures/create-combined-board-textures"

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

const circuitJson: AnyCircuitElement[] = [
  board,
  {
    type: "pcb_hole",
    pcb_hole_id: "mounting-hole",
    x: 0,
    y: 2,
    hole_shape: "circle",
    hole_diameter: 2,
  },
  {
    type: "pcb_silkscreen_line",
    pcb_silkscreen_line_id: "top-line",
    pcb_component_id: "component",
    layer: "top",
    x1: -3,
    y1: 2,
    x2: 3,
    y2: 2,
    stroke_width: 0.5,
  },
  {
    type: "pcb_silkscreen_line",
    pcb_silkscreen_line_id: "bottom-line",
    pcb_component_id: "component",
    layer: "bottom",
    x1: -3,
    y1: 2,
    x2: 3,
    y2: 2,
    stroke_width: 0.5,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "covered-hole",
    x: 2,
    y: 2,
    hole_shape: "circle",
    hole_diameter: 1,
    is_covered_with_solder_mask: true,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "plated-hole",
    shape: "circle",
    x: -2,
    y: -2,
    hole_diameter: 1,
    outer_diameter: 2,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_via",
    pcb_via_id: "via",
    x: 0,
    y: -2,
    hole_diameter: 0.5,
    outer_diameter: 1,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_silkscreen_line",
    pcb_silkscreen_line_id: "top-plated-line",
    pcb_component_id: "component",
    layer: "top",
    x1: -3,
    y1: -2,
    x2: 1,
    y2: -2,
    stroke_width: 0.5,
  },
  {
    type: "pcb_silkscreen_line",
    pcb_silkscreen_line_id: "bottom-plated-line",
    pcb_component_id: "component",
    layer: "bottom",
    x1: -3,
    y1: -2,
    x2: 1,
    y2: -2,
    stroke_width: 0.5,
  },
]

test("combined board textures keep silkscreen out of physical holes", () => {
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    document: {
      createElement: (tag: string) => {
        if (tag !== "canvas") throw new Error(`Unexpected element: ${tag}`)
        return createCanvas(1, 1)
      },
    },
  })

  try {
    const textures = createCombinedBoardTextures({
      circuitJson,
      boardData: board,
      traceTextureResolution: 20,
    })

    const topCanvas = textures.topBoard!.image as ReturnType<
      typeof createCanvas
    >
    const bottomCanvas = textures.bottomBoard!.image as ReturnType<
      typeof createCanvas
    >

    // y=2 maps to pixel 60 on top and is mirrored to pixel 140 on bottom.
    expect(topCanvas.getContext("2d").getImageData(100, 60, 1, 1).data[3]).toBe(
      0,
    )
    expect(
      bottomCanvas.getContext("2d").getImageData(100, 140, 1, 1).data[3],
    ).toBe(0)

    // The same silkscreen lines remain opaque immediately outside the hole.
    expect(topCanvas.getContext("2d").getImageData(130, 60, 1, 1).data[3]).toBe(
      255,
    )
    expect(
      bottomCanvas.getContext("2d").getImageData(130, 140, 1, 1).data[3],
    ).toBe(255)

    // Explicit soldermask coverage still forms a drawable surface over a hole.
    expect(topCanvas.getContext("2d").getImageData(140, 60, 1, 1).data[3]).toBe(
      255,
    )

    // Plated drills and vias are cleared without erasing their copper rings.
    expect(topCanvas.getContext("2d").getImageData(60, 140, 1, 1).data[3]).toBe(
      0,
    )
    expect(
      bottomCanvas.getContext("2d").getImageData(60, 60, 1, 1).data[3],
    ).toBe(0)
    expect(
      topCanvas.getContext("2d").getImageData(100, 140, 1, 1).data[3],
    ).toBe(0)
    expect(
      bottomCanvas.getContext("2d").getImageData(100, 60, 1, 1).data[3],
    ).toBe(0)
    expect(topCanvas.getContext("2d").getImageData(75, 140, 1, 1).data[3]).toBe(
      255,
    )
    expect(
      topCanvas.getContext("2d").getImageData(108, 140, 1, 1).data[3],
    ).toBe(255)
  } finally {
    Object.assign(globalThis, { document: previousDocument })
  }
})
