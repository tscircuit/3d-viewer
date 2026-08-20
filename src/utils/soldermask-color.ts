import type { RGB } from "@jscad/modeling/src/colors"
import type { PcbBoard } from "circuit-json"
import * as THREE from "three"

/** Base colors for the supported 3D PCB soldermask presets. */
export const SOLDERMASK_PRESET_HEX = {
  green: "#004832",
  blue: "#004aab",
  yellow: "#ae8000",
  white: "#dddddd",
  red: "#650202",
  black: "#000000",
  purple: "#15008a",
} as const

export const SOLDERMASK_OPACITY = 0.875

export type SoldermaskColorPreset = keyof typeof SOLDERMASK_PRESET_HEX

export const getBoardSoldermaskColor = (
  board: PcbBoard | null | undefined,
): string | undefined => board?.solder_mask_color

export const resolveSoldermaskColor = (
  requestedColor?: string | null,
): THREE.Color => {
  const normalizedColor = requestedColor?.trim()
  const presetName = normalizedColor?.toLowerCase()
  const colorValue =
    normalizedColor === undefined || presetName === "not_specified"
      ? SOLDERMASK_PRESET_HEX.green
      : (SOLDERMASK_PRESET_HEX[presetName as SoldermaskColorPreset] ??
        normalizedColor)

  // Preserve custom CSS color support for names, hex values, rgb(), and hsl().
  return new THREE.Color(colorValue)
}

export const resolveBoardSoldermaskColor = (
  board: PcbBoard | null | undefined,
): THREE.Color => resolveSoldermaskColor(getBoardSoldermaskColor(board))

export const compositeSoldermaskOverCopper = (
  soldermaskColor: THREE.Color,
  copperColor: THREE.Color,
): THREE.Color =>
  soldermaskColor
    .clone()
    .multiplyScalar(SOLDERMASK_OPACITY)
    .add(copperColor.clone().multiplyScalar(1 - SOLDERMASK_OPACITY))

export const soldermaskColorToCss = (color: THREE.Color): string => {
  const displayColor = color.clone().convertLinearToSRGB()
  const red = Math.round(displayColor.r * 255)
  const green = Math.round(displayColor.g * 255)
  const blue = Math.round(displayColor.b * 255)
  return `rgb(${red},${green},${blue})`
}

export const soldermaskColorToJscadRgb = (color: THREE.Color): RGB => [
  color.r,
  color.g,
  color.b,
]
