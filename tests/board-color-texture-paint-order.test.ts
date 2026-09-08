import { expect, test } from "bun:test"
import {
  BOARD_COLOR_TEXTURE_PAINT_ORDER,
  orderBoardColorTextures,
} from "../src/textures/create-combined-board-textures"

test("through-hole copper paints after soldermask so plated holes stay on top", () => {
  const soldermaskIndex = BOARD_COLOR_TEXTURE_PAINT_ORDER.indexOf("soldermask")
  const throughHoleIndex =
    BOARD_COLOR_TEXTURE_PAINT_ORDER.indexOf("throughHole")

  expect(soldermaskIndex).toBeGreaterThanOrEqual(0)
  expect(throughHoleIndex).toBeGreaterThan(soldermaskIndex)
})

test("orderBoardColorTextures follows the paint order", () => {
  const layers = {
    copperPour: { name: "copperPour" },
    trace: { name: "trace" },
    pad: { name: "pad" },
    soldermask: { name: "soldermask" },
    throughHole: { name: "throughHole" },
    copperText: { name: "copperText" },
    silkscreen: { name: "silkscreen" },
    fabricationNote: { name: "fabricationNote" },
    pcbNote: { name: "pcbNote" },
    panelOutline: { name: "panelOutline" },
    keepout: { name: "keepout" },
  }

  const ordered = orderBoardColorTextures(layers as never)

  expect(ordered.map((layer) => (layer as { name: string }).name)).toEqual([
    ...BOARD_COLOR_TEXTURE_PAINT_ORDER,
  ])
})
