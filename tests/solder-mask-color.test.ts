import { expect, test } from "bun:test"
import { colors, solderMaskColorPresets } from "../src/geoms/constants"
import {
  resolveSolderMaskColor,
  resolveSolderMaskPreset,
} from "../src/utils/resolve-solder-mask-color"

test("resolves each documented solderMaskColor preset", () => {
  for (const preset of [
    "green",
    "red",
    "blue",
    "purple",
    "black",
    "white",
    "yellow",
  ] as const) {
    expect(resolveSolderMaskPreset(preset)).toBe(solderMaskColorPresets[preset])
  }
})

test("a black mask does not render green", () => {
  const black = resolveSolderMaskColor("black")
  expect(black).toBeDefined()
  expect(black).not.toEqual(colors.fr4SolderMaskGreen)

  // A black mask should be dark on every channel, and specifically not
  // dominated by green the way the hard-coded FR4 mask is.
  const [r = 0, g = 0, b = 0] = black!
  expect(Math.max(r, g, b)).toBeLessThan(0.1)
  expect(g).toBeLessThanOrEqual(Math.max(r, b) + 0.01)
})

test("falls back to the material default when no color is specified", () => {
  expect(resolveSolderMaskPreset(undefined)).toBeUndefined()
  expect(resolveSolderMaskPreset("")).toBeUndefined()
  expect(resolveSolderMaskPreset("not_specified")).toBeUndefined()
})

test("ignores casing and surrounding whitespace", () => {
  expect(resolveSolderMaskPreset("  BLACK ")).toBe(solderMaskColorPresets.black)
})

test("unknown colors fall back instead of throwing", () => {
  expect(resolveSolderMaskPreset("chartreuse")).toBeUndefined()
})

test("solder mask over copper stays distinguishable from bare mask", () => {
  for (const [name, preset] of Object.entries(solderMaskColorPresets)) {
    expect(preset.soldermask, name).not.toEqual(preset.soldermaskOverCopper)
  }
})
