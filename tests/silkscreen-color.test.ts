import { expect, spyOn, test } from "bun:test"
import type { PcbBoard, PcbSilkscreenRect } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import * as THREE from "three"
import { createSilkscreenTextureForLayer } from "../src/textures/create-silkscreen-texture-for-layer"
import {
  DEFAULT_SILKSCREEN_COLOR,
  getSilkscreenColor,
  resolveSilkscreenColor,
} from "../src/utils/silkscreen-color"

const createBoard = ({
  silkscreenColor,
}: {
  silkscreenColor?: string
} = {}): PcbBoard => ({
  type: "pcb_board",
  pcb_board_id: "test-board",
  center: { x: 0, y: 0 },
  width: 10,
  height: 10,
  thickness: 1.6,
  material: "fr4",
  num_layers: 2,
  ...(silkscreenColor !== undefined && {
    silkscreen_color: silkscreenColor as PcbBoard["silkscreen_color"],
  }),
})

const toSrgbHex = (color: THREE.Color) =>
  `#${color.getHexString(THREE.SRGBColorSpace)}`

const expectResolvedHex = (requestedColor: string, expectedHex: string) => {
  const resolvedColor = resolveSilkscreenColor(requestedColor)
  if (!resolvedColor) throw new Error(`Expected ${requestedColor} to resolve`)
  expect(toSrgbHex(resolvedColor)).toBe(expectedHex)
}

test("preserves default white silkscreen without an explicit non-white color", () => {
  expect(resolveSilkscreenColor(undefined)).toBeNull()
  expect(resolveSilkscreenColor(null)).toBeNull()
  expect(resolveSilkscreenColor("")).toBeNull()
  expect(resolveSilkscreenColor("white")).toBeNull()
  expect(resolveSilkscreenColor("not_specified")).toBeNull()

  expect(getSilkscreenColor(createBoard())).toBe(DEFAULT_SILKSCREEN_COLOR)
  expect(getSilkscreenColor(createBoard({ silkscreenColor: "white" }))).toBe(
    DEFAULT_SILKSCREEN_COLOR,
  )
  expect(
    getSilkscreenColor(createBoard({ silkscreenColor: "not_specified" })),
  ).toBe(DEFAULT_SILKSCREEN_COLOR)
})

test("supports named and custom CSS silkscreen colors", () => {
  expectResolvedHex("black", "#000000")
  expectResolvedHex("yellow", "#ffff00")
  expectResolvedHex("#123456", "#123456")
  expectResolvedHex("rebeccapurple", "#663399")
  expectResolvedHex("rgb(18, 52, 86)", "#123456")
  expectResolvedHex("hsl(210, 65.4%, 20.4%)", "#123456")

  expect(getSilkscreenColor(createBoard({ silkscreenColor: "black" }))).toBe(
    "rgb(0,0,0)",
  )
  expect(getSilkscreenColor(createBoard({ silkscreenColor: "#123456" }))).toBe(
    "rgb(18,52,86)",
  )
})

test("falls back to default white silkscreen for unsupported strings", () => {
  const warnSpy = spyOn(console, "warn").mockImplementation(() => {})
  try {
    for (const unsupportedColor of [
      "kicad:custom_silkscreen",
      "rgba(18, 52, 86, 0.5)",
      "#12345678",
      "var(--silk)",
    ]) {
      expect(resolveSilkscreenColor(unsupportedColor)).toBeNull()
    }
    expect(
      getSilkscreenColor(
        createBoard({ silkscreenColor: "kicad:custom_silkscreen" }),
      ),
    ).toBe(DEFAULT_SILKSCREEN_COLOR)
    expect(warnSpy).not.toHaveBeenCalled()
  } finally {
    warnSpy.mockRestore()
  }
})

test("createSilkscreenTextureForLayer forwards boardData.silkscreen_color to CircuitToCanvasDrawer", () => {
  const previousDocument = globalThis.document
  const configureSpy = spyOn(CircuitToCanvasDrawer.prototype, "configure")
  const drawElementsSpy = spyOn(
    CircuitToCanvasDrawer.prototype,
    "drawElements",
  ).mockImplementation(() => {})

  Object.assign(globalThis, {
    document: {
      createElement: () => {
        const canvas = {
          width: 0,
          height: 0,
          getContext: () => ({
            canvas,
            translate: () => {},
            scale: () => {},
          }),
        }
        return canvas
      },
    },
  })

  try {
    const board = createBoard({ silkscreenColor: "black" })
    const silkscreenRect: PcbSilkscreenRect = {
      type: "pcb_silkscreen_rect",
      pcb_silkscreen_rect_id: "silk_1",
      pcb_component_id: "comp_1",
      layer: "top",
      center: { x: 0, y: 0 },
      width: 2,
      height: 2,
      stroke_width: 0.1,
    }

    const texture = createSilkscreenTextureForLayer({
      layer: "top",
      circuitJson: [board, silkscreenRect],
      boardData: board,
      traceTextureResolution: 10,
    })

    expect(texture).not.toBeNull()
    expect(configureSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        colorOverrides: expect.objectContaining({
          silkscreen: {
            top: "rgb(0,0,0)",
            bottom: "rgb(0,0,0)",
          },
        }),
      }),
    )
  } finally {
    configureSpy.mockRestore()
    drawElementsSpy.mockRestore()
    Object.assign(globalThis, { document: previousDocument })
  }
})
