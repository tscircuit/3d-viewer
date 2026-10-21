import { expect, spyOn, test } from "bun:test"
import type { PcbBoard } from "circuit-json"
import * as THREE from "three"
import { getSoldermaskPalette } from "../src/textures/soldermask/soldermask-drawing"
import {
  resolveSoldermaskColor,
  SOLDERMASK_PRESET_HEX,
} from "../src/utils/soldermask-color"

const createBoard = ({
  material = "fr4",
  solderMaskColor,
}: {
  material?: PcbBoard["material"]
  solderMaskColor?: string
}): PcbBoard => ({
  type: "pcb_board",
  pcb_board_id: "test-board",
  center: { x: 0, y: 0 },
  width: 10,
  height: 10,
  thickness: 1.6,
  material,
  num_layers: 2,
  ...(solderMaskColor !== undefined && {
    solder_mask_color: solderMaskColor,
  }),
})

const toSrgbHex = (color: THREE.Color) =>
  `#${color.getHexString(THREE.SRGBColorSpace)}`

const expectResolvedHex = (requestedColor: string, expectedHex: string) => {
  const resolvedColor = resolveSoldermaskColor(requestedColor)
  if (!resolvedColor) throw new Error(`Expected ${requestedColor} to resolve`)
  expect(toSrgbHex(resolvedColor)).toBe(expectedHex)
}

test("resolves the documented non-green soldermask presets", () => {
  for (const [preset, expectedHex] of Object.entries(SOLDERMASK_PRESET_HEX)) {
    const color = resolveSoldermaskColor(preset)
    expect(color).not.toBeNull()
    if (color) expect(toSrgbHex(color)).toBe(expectedHex)
  }
})

test("preserves the existing material colors without an explicit preset", () => {
  expect(getSoldermaskPalette(createBoard({}))).toMatchObject({
    soldermask: "rgb(15, 79, 48)",
    soldermaskOverCopper: "rgb(23, 97, 59)",
  })
  expect(
    getSoldermaskPalette(createBoard({ solderMaskColor: "not_specified" })),
  ).toMatchObject({
    soldermask: "rgb(15, 79, 48)",
    soldermaskOverCopper: "rgb(23, 97, 59)",
  })
  expect(
    getSoldermaskPalette(createBoard({ solderMaskColor: "green" })),
  ).toMatchObject({
    soldermask: "rgb(15, 79, 48)",
    soldermaskOverCopper: "rgb(23, 97, 59)",
  })
  expect(getSoldermaskPalette(createBoard({ material: "fr1" }))).toMatchObject({
    soldermask: "rgb(5, 26, 10)",
    soldermaskOverCopper: "rgb(230, 153, 51)",
  })
  expect(
    getSoldermaskPalette(
      createBoard({ material: "fr1", solderMaskColor: "green" }),
    ),
  ).toMatchObject({
    soldermask: "rgb(5, 26, 10)",
    soldermaskOverCopper: "rgb(230, 153, 51)",
  })
})

test("flex defaults to amber coverlay with copper-colored traces", () => {
  for (const solderMaskColor of [undefined, "not_specified", "green"]) {
    expect(
      getSoldermaskPalette(createBoard({ material: "flex", solderMaskColor })),
    ).toMatchObject({
      soldermask: "rgb(204,155,50)",
      soldermaskOverCopper: "rgb(203,156,59)",
      copper: "rgb(199, 161, 99)",
    })
  }
})

test("default flex palette matches the Three Disc Capsule amber override", () => {
  expect(getSoldermaskPalette(createBoard({ material: "flex" }))).toEqual(
    getSoldermaskPalette(
      createBoard({ material: "flex", solderMaskColor: "#cc9b32" }),
    ),
  )
})

test("flex preserves explicitly configured mask colors", () => {
  expect(
    getSoldermaskPalette(
      createBoard({ material: "flex", solderMaskColor: "#123456" }),
    ),
  ).toMatchObject({
    soldermask: "rgb(18,52,86)",
    soldermaskOverCopper: "rgb(78,77,88)",
  })
})

test("supports custom CSS colors", () => {
  expectResolvedHex("#123456", "#123456")
  expectResolvedHex("rebeccapurple", "#663399")
  expectResolvedHex("rgb(18, 52, 86)", "#123456")
  expectResolvedHex("hsl(210, 65.4%, 20.4%)", "#123456")
  expect(
    getSoldermaskPalette(createBoard({ solderMaskColor: "#123456" })),
  ).toMatchObject({
    soldermask: "rgb(18,52,86)",
    soldermaskOverCopper: "rgb(78,77,88)",
  })
})

test("falls back to the existing material color for unsupported strings", () => {
  const warnSpy = spyOn(console, "warn").mockImplementation(() => {})
  try {
    for (const unsupportedColor of [
      "kicad:custom_solder_mask",
      "rgba(18, 52, 86, 0.5)",
      "#12345678",
      "var(--mask)",
    ]) {
      expect(resolveSoldermaskColor(unsupportedColor)).toBeNull()
    }
    expect(
      getSoldermaskPalette(
        createBoard({ solderMaskColor: "kicad:custom_solder_mask" }),
      ).soldermask,
    ).toBe("rgb(15, 79, 48)")
    expect(warnSpy).not.toHaveBeenCalled()
  } finally {
    warnSpy.mockRestore()
  }
})

test("uses calibrated preset colors over substrate and masked copper", () => {
  const expectedPalettes = {
    red: ["rgb(101,2,2)", "rgb(119,60,34)"],
    blue: ["rgb(0,63,125)", "rgb(42,70,124)"],
    purple: ["rgb(76,29,105)", "rgb(86,45,105)"],
    black: ["rgb(7,16,20)", "rgb(22,23,22)"],
    white: ["rgb(221,221,221)", "rgb(218,215,211)"],
    yellow: ["rgb(220,200,74)", "rgb(218,197,76)"],
  }

  for (const [
    solderMaskColor,
    [soldermask, soldermaskOverCopper],
  ] of Object.entries(expectedPalettes)) {
    expect(
      getSoldermaskPalette(createBoard({ solderMaskColor })),
    ).toMatchObject({ soldermask, soldermaskOverCopper })
  }
})
